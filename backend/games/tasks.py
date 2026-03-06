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
    for game in games:
        if game.igdb_id:
            refresh_game_details_by_igdb_id(game.igdb_id)
        elif game.igdb_slug:
            refresh_game_details(game.igdb_slug)
        refresh_hltb_cache(game)


@app.task(ignore_result=True)
def refresh_game_details(slug):
    game_obj = Game.objects.filter(igdb_slug=slug).first()
    if game_obj is None:
        logger.warning('refresh_game_details: game not found by igdb_slug=%s', slug)
        return None

    try:
        igdb_game = resolve_igdb_game_details(game_obj, slug)
    except Exception:
        logger.exception('refresh_game_details: failed to resolve IGDB details for slug=%s', slug)
        return None

    if not igdb_game:
        return game_obj.id

    fields_to_update = {}
    fields_to_update.update(get_igdb_game_new_fields(igdb_game))
    update_fields_if_needed(game_obj, fields_to_update)
    async_to_sync(update_game_genres_from_igdb)(game_obj, igdb_game)
    async_to_sync(update_game_developers_from_igdb)(game_obj, igdb_game)
    async_to_sync(update_game_beat_times_from_igdb)(game_obj, igdb_game)
    async_to_sync(update_game_media_from_igdb)(game_obj, igdb_game)
    async_to_sync(update_game_stores_from_igdb)(game_obj, igdb_game)
    return game_obj.id


@app.task(ignore_result=True)
def refresh_game_details_by_igdb_id(igdb_id):
    if igdb_id is None:
        logger.warning('refresh_game_details_by_igdb_id: empty igdb_id')
        return None

    game_obj = Game.objects.filter(igdb_id=igdb_id).first()
    if game_obj is None:
        logger.warning('refresh_game_details_by_igdb_id: game not found by igdb_id=%s', igdb_id)
        return None

    try:
        igdb_game = query_igdb_game_by_id(int(igdb_id))
    except Exception:
        logger.exception('refresh_game_details_by_igdb_id: failed to query IGDB for igdb_id=%s', igdb_id)
        return None

    if not igdb_game:
        return game_obj.id

    fields_to_update = {}
    fields_to_update.update(get_igdb_game_new_fields(igdb_game))
    update_fields_if_needed(game_obj, fields_to_update)
    async_to_sync(update_game_genres_from_igdb)(game_obj, igdb_game)
    async_to_sync(update_game_developers_from_igdb)(game_obj, igdb_game)
    async_to_sync(update_game_beat_times_from_igdb)(game_obj, igdb_game)
    async_to_sync(update_game_media_from_igdb)(game_obj, igdb_game)
    async_to_sync(update_game_stores_from_igdb)(game_obj, igdb_game)
    return game_obj.id


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
        logger.info('refresh_hltb_beat_times_by_game_id: no HLTB result for game id=%s', game_id)
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
        return

    hltb_key = get_hltb_game_key(game_name)
    try:
        results = HowLongToBeat(1).search(game_name.replace('’', '\''), similarity_case_sensitive=False)
        hltb_game = max(results, key=lambda element: element.similarity).__dict__
        cache.set(hltb_key, hltb_game, CACHE_TIMEOUT)
    except (ValueError, TypeError):
        cache.set(hltb_key, None, CACHE_TIMEOUT)
    except ConnectionError:
        pass
