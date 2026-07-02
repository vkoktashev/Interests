from datetime import datetime
import logging

from asgiref.sync import async_to_sync
from celery.schedules import crontab
from django.core.cache import cache
from django.db.models import Q
from django.utils import timezone
from howlongtobeatpy import HowLongToBeat
from requests.exceptions import ConnectionError

from config.celery import app
from games.functions import get_hltb_game_key
from games.integrations.hltb import get_game_release_year, get_hltb_game, extract_hltb_hours_map
from games.integrations.igdb import (
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
from utils.constants import UPDATE_DATES_HOUR, UPDATE_DATES_MINUTE, CACHE_TIMEOUT
from utils.functions import update_fields_if_needed

logger = logging.getLogger(__name__)


@app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(
        crontab(hour=UPDATE_DATES_HOUR, minute=UPDATE_DATES_MINUTE),
        update_upcoming_games.s(),
    )


@app.task
def update_upcoming_games():
    today_date = datetime.today().date()
    games = Game.objects.filter(Q(igdb_release_date__gte=today_date) | Q(igdb_release_date=None))
    candidates_count = games.count()
    updated_count = 0
    skipped_count = 0
    failed_count = 0

    logger.info('update_upcoming_games: start today=%s candidates=%s', today_date, candidates_count)

    for game in games:
        logger.debug(
            'update_upcoming_games: processing game id=%s name=%s igdb_id=%s igdb_slug=%s release_date=%s',
            game.id,
            game.igdb_name,
            game.igdb_id,
            game.igdb_slug,
            game.igdb_release_date,
        )

        status = 'skipped'
        try:
            if game.igdb_id:
                status, _ = refresh_game_details_by_igdb_id_with_status(game.igdb_id)
            elif game.igdb_slug:
                status, _ = refresh_game_details_with_status(game.igdb_slug)
            else:
                logger.warning(
                    'update_upcoming_games: skipped game id=%s name=%s reason=no_igdb_identity',
                    game.id,
                    game.igdb_name,
                )

            if status == 'updated':
                updated_count += 1
            elif status == 'failed':
                failed_count += 1
            else:
                skipped_count += 1
        except Exception:
            failed_count += 1
            logger.exception(
                'update_upcoming_games: failed game id=%s name=%s igdb_id=%s igdb_slug=%s',
                game.id,
                game.igdb_name,
                game.igdb_id,
                game.igdb_slug,
            )

        refresh_hltb_cache(game)

    logger.info(
        'update_upcoming_games: finish candidates=%s updated=%s skipped=%s failed=%s',
        candidates_count,
        updated_count,
        skipped_count,
        failed_count,
    )


@app.task(ignore_result=True)
def refresh_game_details(slug):
    status, game_id = refresh_game_details_with_status(slug)
    if status == 'updated':
        return game_id
    return None


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


@app.task(ignore_result=True)
def refresh_game_details_by_igdb_id(igdb_id):
    status, game_id = refresh_game_details_by_igdb_id_with_status(igdb_id)
    if status == 'updated':
        return game_id
    return None


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


@app.task(ignore_result=True)
def refresh_hltb_beat_times_by_game_id(game_id):
    game_obj = Game.objects.filter(id=game_id).first()
    if game_obj is None:
        logger.warning('refresh_hltb_beat_times_by_game_id: game not found by id=%s', game_id)
        return None
    if not game_obj.igdb_name:
        logger.warning('refresh_hltb_beat_times_by_game_id: empty game name for id=%s', game_id)
        return None

    release_year = get_game_release_year(game_obj.igdb_release_date)
    hltb_game = get_hltb_game(game_obj.igdb_name, release_year)
    if not hltb_game:
        logger.debug('refresh_hltb_beat_times_by_game_id: no HLTB result for game id=%s', game_id)
        return game_id

    update_fields_if_needed(game_obj, {
        'hltb_name': hltb_game.get('game_name') or game_obj.hltb_name,
        'hltb_id': hltb_game.get('game_id') or game_obj.hltb_id,
    })

    hours_map = extract_hltb_hours_map(hltb_game)
    existing_entries = GameBeatTime.objects.filter(game=game_obj, source=GameBeatTime.SOURCE_HLTB)
    upserted_ids = []
    now = timezone.now()
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

    return game_id


def refresh_hltb_cache(game):
    game_name = game.igdb_name
    if not game_name:
        logger.debug('refresh_hltb_cache: skipped game id=%s reason=empty_name', game.id)
        return 'skipped'

    hltb_key = get_hltb_game_key(game_name)
    try:
        results = HowLongToBeat(1).search(game_name.replace('’', '\''), similarity_case_sensitive=False)
        hltb_game = max(results, key=lambda element: element.similarity).__dict__
        cache.set(hltb_key, hltb_game, CACHE_TIMEOUT)
        logger.debug(
            'refresh_hltb_cache: refreshed game id=%s name=%s hltb_id=%s',
            game.id,
            game_name,
            hltb_game.get('game_id'),
        )
        return 'updated'
    except (ValueError, TypeError):
        cache.set(hltb_key, None, CACHE_TIMEOUT)
        logger.debug('refresh_hltb_cache: skipped game id=%s name=%s reason=no_hltb_result', game.id, game_name)
        return 'skipped'
    except ConnectionError:
        logger.warning('refresh_hltb_cache: failed game id=%s name=%s reason=connection_error', game.id, game_name)
        return 'failed'


def _get_changed_fields(obj, new_fields):
    changed_fields = []
    for key, value in new_fields.items():
        if str(value) != str(getattr(obj, key)):
            changed_fields.append(key)
    return changed_fields
