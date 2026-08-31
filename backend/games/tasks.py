from datetime import datetime
import logging

from asgiref.sync import async_to_sync
from django.core.cache import cache
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from config.celery import app
from games.functions import is_game_released
from games.integrations.hltb import get_game_release_year, get_hltb_game, extract_hltb_hours_map
from games.integrations.igdb import (
    attach_igdb_game_time_to_beat,
    get_igdb_game_new_fields,
    query_igdb_game_by_id,
    resolve_igdb_game_details,
    update_game_beat_times_from_igdb,
    update_game_developers_from_igdb,
    update_game_genres_from_igdb,
    update_game_media_from_igdb,
    update_game_stores_from_igdb,
)
from games.models import Game, GameBeatTime
from integrations import ExternalUnavailableError
from utils.celery import ExternalRefreshTask, enqueue_background_task_once, execute_locked_task
from utils.functions import update_fields_if_needed

logger = logging.getLogger(__name__)

HLTB_REFRESH_LOCK_TIMEOUT_SECONDS = 60 * 10


def get_hltb_refresh_lock_key(game_id):
    return f'hltb_refresh_enqueued_{game_id}'


@app.task
def update_upcoming_games():
    today_date = datetime.today().date()
    games = Game.objects.filter(Q(igdb_release_date__gte=today_date) | Q(igdb_release_date=None))
    candidates_count = games.count()
    scheduled_count = 0
    skipped_count = 0
    failed_count = 0

    logger.info('update_upcoming_games: start today=%s candidates=%s', today_date, candidates_count)

    for game in games.iterator(chunk_size=200):
        try:
            if game.igdb_id:
                is_queued = enqueue_background_task_once(
                    refresh_game_details_by_igdb_id,
                    identity=f'igdb:{game.igdb_id}',
                    args=(game.igdb_id,),
                    task_name='refresh_game_details_by_igdb_id',
                )
            elif game.igdb_slug:
                is_queued = enqueue_background_task_once(
                    refresh_game_details,
                    identity=f'slug:{game.igdb_slug}',
                    args=(game.igdb_slug,),
                    task_name='refresh_game_details',
                )
            else:
                is_queued = False
                logger.warning(
                    'update_upcoming_games: skipped game id=%s name=%s reason=no_igdb_identity',
                    game.id,
                    game.igdb_name,
                )

            if is_queued:
                scheduled_count += 1
            else:
                skipped_count += 1
        except Exception:
            failed_count += 1
            logger.exception(
                'update_upcoming_games: failed to enqueue game id=%s name=%s igdb_id=%s igdb_slug=%s',
                game.id,
                game.igdb_name,
                game.igdb_id,
                game.igdb_slug,
            )

    logger.info(
        'update_upcoming_games: finish candidates=%s scheduled=%s skipped=%s failed=%s',
        candidates_count,
        scheduled_count,
        skipped_count,
        failed_count,
    )
    return {
        'candidates': candidates_count,
        'scheduled': scheduled_count,
        'skipped': skipped_count,
        'errors': failed_count,
    }


@app.task(base=ExternalRefreshTask, ignore_result=True)
def refresh_game_details(slug):
    def refresh():
        status, game_id = refresh_game_details_with_status(slug)
        if status == 'failed':
            raise RuntimeError(f'Failed to refresh game by slug: {slug}')
        return game_id if status == 'updated' else None

    return execute_locked_task('refresh_game_details', f'slug:{slug}', refresh)


def refresh_game_details_with_status(slug):
    return _refresh_game_details(slug)


def _refresh_game_details(slug):
    logger.debug('refresh_game_details: start igdb_slug=%s', slug)

    game_obj = Game.objects.filter(igdb_slug=slug).first()
    if game_obj is None:
        logger.warning('refresh_game_details: game not found by igdb_slug=%s', slug)
        return 'skipped', None

    try:
        igdb_game = resolve_igdb_game_details(game_obj, slug)
    except ExternalUnavailableError:
        raise
    except Exception:
        logger.exception(
            'refresh_game_details: failed to resolve IGDB details for game id=%s name=%s igdb_slug=%s',
            game_obj.id,
            game_obj.igdb_name,
            slug,
        )
        return 'failed', game_obj.id

    if not igdb_game:
        logger.warning(
            'refresh_game_details: skipped game id=%s name=%s igdb_slug=%s reason=no_igdb_result',
            game_obj.id,
            game_obj.igdb_name,
            slug,
        )
        return 'skipped', game_obj.id

    return _apply_igdb_game_details(game_obj, igdb_game, 'refresh_game_details')


@app.task(base=ExternalRefreshTask, ignore_result=True)
def refresh_game_details_by_igdb_id(igdb_id):
    def refresh():
        status, game_id = refresh_game_details_by_igdb_id_with_status(igdb_id)
        if status == 'failed':
            raise RuntimeError(f'Failed to refresh game by IGDB id: {igdb_id}')
        return game_id if status == 'updated' else None

    return execute_locked_task('refresh_game_details_by_igdb_id', f'igdb:{igdb_id}', refresh)


def refresh_game_details_by_igdb_id_with_status(igdb_id):
    return _refresh_game_details_by_igdb_id(igdb_id)


def _refresh_game_details_by_igdb_id(igdb_id):
    logger.debug('refresh_game_details_by_igdb_id: start igdb_id=%s', igdb_id)

    if igdb_id is None:
        logger.warning('refresh_game_details_by_igdb_id: empty igdb_id')
        return 'skipped', None

    game_obj = Game.objects.filter(igdb_id=igdb_id).first()
    if game_obj is None:
        logger.warning('refresh_game_details_by_igdb_id: game not found by igdb_id=%s', igdb_id)
        return 'skipped', None

    try:
        igdb_game = query_igdb_game_by_id(int(igdb_id))
    except ExternalUnavailableError:
        raise
    except Exception:
        logger.exception(
            'refresh_game_details_by_igdb_id: failed to query IGDB for game id=%s name=%s igdb_id=%s',
            game_obj.id,
            game_obj.igdb_name,
            igdb_id,
        )
        return 'failed', game_obj.id

    if not igdb_game:
        logger.warning(
            'refresh_game_details_by_igdb_id: skipped game id=%s name=%s igdb_id=%s reason=no_igdb_result',
            game_obj.id,
            game_obj.igdb_name,
            igdb_id,
        )
        return 'skipped', game_obj.id

    return _apply_igdb_game_details(game_obj, igdb_game, 'refresh_game_details_by_igdb_id')


def _apply_igdb_game_details(game_obj, igdb_game, source):
    try:
        igdb_game = attach_igdb_game_time_to_beat(igdb_game, game_obj)
        with transaction.atomic():
            fields_to_update = {}
            fields_to_update.update(get_igdb_game_new_fields(igdb_game))
            changed_fields = _get_changed_fields(game_obj, fields_to_update)
            update_fields_if_needed(game_obj, fields_to_update)
            async_to_sync(update_game_genres_from_igdb)(game_obj, igdb_game)
            async_to_sync(update_game_developers_from_igdb)(game_obj, igdb_game)
            async_to_sync(update_game_beat_times_from_igdb)(game_obj, igdb_game)
            async_to_sync(update_game_media_from_igdb)(game_obj, igdb_game)
            async_to_sync(update_game_stores_from_igdb)(game_obj, igdb_game)
    except Exception:
        logger.exception(
            '%s: failed to apply IGDB details for game id=%s name=%s igdb_id=%s igdb_slug=%s',
            source,
            game_obj.id,
            game_obj.igdb_name,
            game_obj.igdb_id,
            game_obj.igdb_slug,
        )
        return 'failed', game_obj.id

    logger.debug(
        '%s: refreshed game id=%s name=%s igdb_id=%s igdb_slug=%s changed_fields=%s',
        source,
        game_obj.id,
        game_obj.igdb_name,
        game_obj.igdb_id,
        game_obj.igdb_slug,
        changed_fields,
    )
    return 'updated', game_obj.id


def refresh_hltb_beat_times_for_game(game_obj, now=None):
    if not game_obj.igdb_name:
        logger.warning('refresh_hltb_beat_times_for_game: empty game name for id=%s', game_obj.id)
        return None
    if not is_game_released(game_obj):
        logger.debug('refresh_hltb_beat_times_for_game: skipped game id=%s reason=unreleased', game_obj.id)
        return None

    if now is None:
        now = timezone.now()
    update_fields_if_needed(game_obj, {'hltb_last_attempt': now})

    release_year = get_game_release_year(game_obj.igdb_release_date)
    hltb_game = get_hltb_game(game_obj.igdb_name, release_year)
    if not hltb_game:
        logger.debug('refresh_hltb_beat_times_for_game: no HLTB result for game id=%s', game_obj.id)
        return None

    hours_map = extract_hltb_hours_map(hltb_game)
    with transaction.atomic():
        update_fields_if_needed(game_obj, {
            'hltb_name': hltb_game.get('game_name') or game_obj.hltb_name,
            'hltb_id': hltb_game.get('game_id') or game_obj.hltb_id,
        })

        if not hours_map:
            logger.debug('refresh_hltb_beat_times_for_game: no valid HLTB hours for game id=%s', game_obj.id)
            return None

        existing_entries = GameBeatTime.objects.filter(game=game_obj, source=GameBeatTime.SOURCE_HLTB)
        upserted_ids = []
        for beat_type, hours_value in (
            (GameBeatTime.TYPE_MAIN, hours_map.get('main')),
            (GameBeatTime.TYPE_EXTRA, hours_map.get('extra')),
            (GameBeatTime.TYPE_COMPLETE, hours_map.get('complete')),
        ):
            if hours_value is None:
                continue
            beat_time = GameBeatTime.objects.filter(
                game=game_obj,
                source=GameBeatTime.SOURCE_HLTB,
                type=beat_type,
            ).first()
            if beat_time is None:
                beat_time = GameBeatTime.objects.create(
                    game=game_obj,
                    source=GameBeatTime.SOURCE_HLTB,
                    type=beat_type,
                    hours=hours_value,
                    last_update=now,
                )
            else:
                update_fields_if_needed(beat_time, {'hours': hours_value, 'last_update': now})
            upserted_ids.append(beat_time.id)

        if upserted_ids:
            existing_entries.exclude(id__in=upserted_ids).delete()
        else:
            existing_entries.delete()

    return hours_map


@app.task(ignore_result=True)
def refresh_hltb_beat_times_by_game_id(game_id):
    game_obj = Game.objects.filter(id=game_id).first()
    if game_obj is None:
        logger.warning('refresh_hltb_beat_times_by_game_id: game not found by id=%s', game_id)
        return None

    try:
        refresh_hltb_beat_times_for_game(game_obj)
    finally:
        cache.delete(get_hltb_refresh_lock_key(game_id))
    return game_id


def _get_changed_fields(obj, new_fields):
    changed_fields = []
    for key, value in new_fields.items():
        if str(value) != str(getattr(obj, key)):
            changed_fields.append(key)
    return changed_fields
