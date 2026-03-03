from datetime import datetime

from asgiref.sync import async_to_sync
from celery.schedules import crontab
from django.core.cache import cache
from django.db.models import Q
from howlongtobeatpy import HowLongToBeat
from requests.exceptions import ConnectionError

from config.celery import app
from games.functions import get_hltb_game_key
from games.integrations.igdb import (
    get_game_legacy_fields_from_igdb,
    get_igdb_game_new_fields,
    query_igdb_game_by_id,
    resolve_igdb_game_details,
    update_game_developers_from_igdb,
    update_game_genres_from_igdb,
    update_game_media_from_igdb,
    update_game_stores_from_igdb,
)
from games.models import Game
from utils.constants import UPDATE_DATES_HOUR, UPDATE_DATES_MINUTE, CACHE_TIMEOUT
from utils.functions import update_fields_if_needed


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
        refresh_game_details(game.rawg_slug)
        refresh_hltb_cache(game)


@app.task
def refresh_game_details(slug):
    game_obj = Game.objects.filter(rawg_slug=slug).first()
    if game_obj is None:
        return None

    try:
        igdb_game = resolve_igdb_game_details(game_obj, slug)
    except Exception:
        return None

    if not igdb_game:
        return game_obj

    fields_to_update = {}
    fields_to_update.update(get_igdb_game_new_fields(igdb_game))
    fields_to_update.update(get_game_legacy_fields_from_igdb(igdb_game, slug))
    update_fields_if_needed(game_obj, fields_to_update)
    async_to_sync(update_game_genres_from_igdb)(game_obj, igdb_game)
    async_to_sync(update_game_developers_from_igdb)(game_obj, igdb_game)
    async_to_sync(update_game_media_from_igdb)(game_obj, igdb_game)
    async_to_sync(update_game_stores_from_igdb)(game_obj, igdb_game)
    return game_obj


@app.task
def refresh_game_details_by_igdb_id(igdb_id):
    if igdb_id is None:
        return None

    game_obj = Game.objects.filter(igdb_id=igdb_id).first()
    if game_obj is None:
        return None

    try:
        igdb_game = query_igdb_game_by_id(int(igdb_id))
    except Exception:
        return None

    if not igdb_game:
        return game_obj

    slug_for_legacy = game_obj.rawg_slug or igdb_game.get('slug') or ''
    fields_to_update = {}
    fields_to_update.update(get_igdb_game_new_fields(igdb_game))
    fields_to_update.update(get_game_legacy_fields_from_igdb(igdb_game, slug_for_legacy))
    update_fields_if_needed(game_obj, fields_to_update)
    async_to_sync(update_game_genres_from_igdb)(game_obj, igdb_game)
    async_to_sync(update_game_developers_from_igdb)(game_obj, igdb_game)
    async_to_sync(update_game_media_from_igdb)(game_obj, igdb_game)
    async_to_sync(update_game_stores_from_igdb)(game_obj, igdb_game)
    return game_obj


def refresh_hltb_cache(game):
    game_name = game.igdb_name or game.rawg_name
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
