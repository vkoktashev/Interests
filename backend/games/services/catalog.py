from asgiref.sync import async_to_sync, sync_to_async
from django.core.cache import cache
from django.db import transaction

from games.integrations.igdb import (
    IGDB_GAME_TYPE_IDS,
    attach_igdb_game_time_to_beat,
    get_game_search_results,
    get_igdb_game_new_fields,
    query_igdb_game_by_slug,
    query_igdb_platforms,
    resolve_igdb_game_details,
    update_game_beat_times_from_igdb,
    update_game_developers_from_igdb,
    update_game_genres_from_igdb,
    update_game_media_from_igdb,
    update_game_stores_from_igdb,
)
from games.models import Game, GameBeatTime
from games.services.parser_service import parse_game_prices_from_db
from utils.functions import update_fields_if_needed


IGDB_PLATFORMS_CACHE_KEY = 'igdb:platforms'
IGDB_PLATFORMS_CACHE_TIMEOUT = 24 * 60 * 60


class GameNotFoundError(Exception):
    pass


class IgdbUnavailableError(Exception):
    pass


class InvalidSearchFilterError(Exception):
    pass


def search_igdb_games(query, page, page_size, game_types_value, platforms_value):
    game_types = _parse_id_filter(
        game_types_value,
        'game_types',
        allowed_values=IGDB_GAME_TYPE_IDS,
    )
    platform_ids = _parse_id_filter(platforms_value, 'platforms', positive_only=True)
    try:
        return get_game_search_results(query, page, page_size, game_types, platform_ids)
    except Exception as error:
        raise IgdbUnavailableError from error


def get_igdb_platforms():
    platforms = cache.get(IGDB_PLATFORMS_CACHE_KEY)
    if platforms is not None:
        return platforms

    try:
        platforms = query_igdb_platforms()
    except Exception as error:
        raise IgdbUnavailableError from error
    cache.set(IGDB_PLATFORMS_CACHE_KEY, platforms, IGDB_PLATFORMS_CACHE_TIMEOUT)
    return platforms


async def get_or_sync_game(slug):
    game = await get_or_create_game(slug, include_media=True)
    has_igdb_beat_times = await GameBeatTime.objects.filter(
        game=game,
        source=GameBeatTime.SOURCE_IGDB,
    ).aexists()
    should_fetch_from_igdb = (
        game.igdb_last_update is None
        or game.igdb_videos_count is None
        or game.igdb_screenshots_count is None
        or not game.igdb_name
        or not has_igdb_beat_times
    )
    if not should_fetch_from_igdb:
        return game

    try:
        igdb_game = await sync_to_async(resolve_igdb_game_details)(game, slug)
    except Exception:
        igdb_game = None
    if igdb_game is not None:
        igdb_game = await sync_to_async(attach_igdb_game_time_to_beat)(igdb_game, game)
        game = await sync_to_async(_apply_igdb_game)(game, igdb_game, include_media=True)
    elif game.igdb_last_update is None:
        raise IgdbUnavailableError
    return game


async def get_or_create_game(slug, include_media=False):
    game = await Game.objects.filter(igdb_slug=slug).afirst()
    if game is not None:
        return game

    try:
        igdb_game = await sync_to_async(query_igdb_game_by_slug)(slug)
    except Exception as error:
        raise IgdbUnavailableError from error
    if not igdb_game:
        raise GameNotFoundError

    igdb_game = await sync_to_async(attach_igdb_game_time_to_beat)(igdb_game)
    fields = get_igdb_game_new_fields(igdb_game)
    igdb_id = fields.get('igdb_id')
    lookup = {'igdb_id': igdb_id} if igdb_id is not None else {'igdb_slug': slug}
    return await sync_to_async(_create_and_apply_igdb_game)(
        lookup,
        fields,
        igdb_game,
        include_media,
    )


async def get_game_prices(slug, user):
    game = await Game.objects.filter(igdb_slug=slug).afirst()
    if game is None:
        raise GameNotFoundError

    steam_region = 'ru'
    if getattr(user, 'is_authenticated', False):
        steam_region = user.steam_account_region or 'ru'
    return await parse_game_prices_from_db(game, steam_region=steam_region)


@transaction.atomic
def _create_and_apply_igdb_game(lookup, fields, igdb_game, include_media):
    defaults = {key: value for key, value in fields.items() if key not in lookup}
    game, created = Game.objects.get_or_create(**lookup, defaults=defaults)
    if not created:
        update_fields_if_needed(game, fields)
    _apply_igdb_relations(game, igdb_game, include_media)
    return game


@transaction.atomic
def _apply_igdb_game(game, igdb_game, include_media):
    update_fields_if_needed(game, get_igdb_game_new_fields(igdb_game))
    _apply_igdb_relations(game, igdb_game, include_media)
    return game


def _apply_igdb_relations(game, igdb_game, include_media):
    async_to_sync(update_game_genres_from_igdb)(game, igdb_game)
    async_to_sync(update_game_developers_from_igdb)(game, igdb_game)
    async_to_sync(update_game_beat_times_from_igdb)(game, igdb_game)
    if include_media:
        async_to_sync(update_game_media_from_igdb)(game, igdb_game)
    async_to_sync(update_game_stores_from_igdb)(game, igdb_game)


def _parse_id_filter(value, name, allowed_values=None, positive_only=False):
    if value is None:
        return None
    if value == 'none':
        return []

    try:
        parsed_values = sorted(set(
            int(item)
            for item in value.split(',')
            if item.strip()
        ))
    except ValueError as error:
        raise InvalidSearchFilterError(f'Invalid {name} value.') from error

    if allowed_values is not None and any(item not in allowed_values for item in parsed_values):
        raise InvalidSearchFilterError(f'Invalid {name} value.')
    if positive_only and any(item <= 0 for item in parsed_values):
        raise InvalidSearchFilterError(f'Invalid {name} value.')
    return parsed_values
