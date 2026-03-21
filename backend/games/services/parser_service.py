from datetime import date

from asgiref.sync import sync_to_async

from games.integrations.igm import get_igm_store_info, get_igm_store_price
from games.integrations.plati import get_plati_store_info, get_plati_store_price
from games.integrations.steam import get_steam_region_label, get_steam_store_price
from games.models import Game, GameDeveloper, GameGenre, GameScreenshot, GameStore, GameTrailer
from games.integrations.hltb import translate_hltb_time
from utils.functions import objects_to_str


def format_game_release_date(value):
    if not value:
        return None
    if isinstance(value, date):
        return value.strftime('%d.%m.%Y')
    if isinstance(value, str):
        try:
            return date.fromisoformat(value).strftime('%d.%m.%Y')
        except ValueError:
            return None
    return None


def parse_game(source_game, hltb_game=None):
    platforms = [obj['platform'] for obj in source_game['platforms']]

    new_game = {
        'name': source_game.get('name'),
        'slug': source_game.get('slug'),
        'overview': source_game.get('description'),
        'metacritic': source_game.get('metacritic'),
        'genres': objects_to_str(source_game['genres']),
        'developers': objects_to_str(source_game['developers']),
        'platforms': objects_to_str(platforms),
        'background': source_game.get('background_image_additional')
        if source_game.get('background_image_additional') is not None
        else source_game.get('background_image'),
        'poster': source_game.get('background_image'),
        'release_date': '.'.join(reversed(source_game['released'].split('-')))
        if source_game.get('released') is not None else None,
        'stores': source_game.get('stores'),
    }

    if hltb_game is not None:
        translate_hltb_time(hltb_game, 'main_story', 'gameplay_main', 'gameplay_main_unit')
        translate_hltb_time(hltb_game, 'main_extra', 'gameplay_main_extra', 'gameplay_main_extra_unit')
        translate_hltb_time(hltb_game, 'completionist', 'gameplay_completionist', 'gameplay_completionist_unit')
        new_game.update({'hltb': hltb_game})

    return new_game


async def parse_game_from_db(game: Game, hltb_game=None):
    genres = []
    game_genres = GameGenre.objects.filter(game=game).select_related('genre')
    async for game_genre in game_genres:
        genres.append({
            'id': game_genre.genre.igdb_id,
            'name': game_genre.genre.igdb_name,
            'slug': game_genre.genre.igdb_slug,
        })

    stores = []
    game_stores = GameStore.objects.filter(game=game).select_related('store')
    async for game_store in game_stores:
        stores.append({
            'store': {
                'id': game_store.store.igdb_id,
                'name': game_store.store.igdb_name,
                'slug': game_store.store.igdb_slug,
            },
            'url': game_store.url,
        })

    developers = []
    game_developers = GameDeveloper.objects.filter(game=game).select_related('developer').order_by('sort_order')
    async for game_developer in game_developers:
        developers.append({
            'name': game_developer.developer.name,
        })

    trailers = []
    game_trailers = GameTrailer.objects.filter(game=game).order_by('sort_order', 'id')
    async for game_trailer in game_trailers:
        trailers.append({
            'id': game_trailer.igdb_id,
            'name': game_trailer.name,
            'url': game_trailer.url,
        })

    screenshots = []
    game_screenshots = GameScreenshot.objects.filter(game=game).order_by('sort_order', 'id')
    async for game_screenshot in game_screenshots:
        screenshots.append({
            'id': game_screenshot.igdb_id,
            'image': game_screenshot.image,
            'width': game_screenshot.width,
            'height': game_screenshot.height,
        })

    score_value = game.igdb_rating or game.igdb_aggregated_rating
    if score_value is not None:
        try:
            score_value = int(round(float(score_value)))
        except (TypeError, ValueError):
            score_value = None

    release_date_value = game.igdb_release_date
    new_game = {
        'id': game.id,
        'name': game.igdb_name,
        'slug': game.igdb_slug or '',
        'overview': game.igdb_summary,
        'metacritic': score_value,
        'genres': objects_to_str(genres),
        'developers': objects_to_str(developers),
        'platforms': game.igdb_platforms,
        'background': game.igdb_cover_url,
        'poster': game.igdb_cover_url,
        'release_date': format_game_release_date(release_date_value),
        'movies_count': game.igdb_videos_count if game.igdb_videos_count is not None else 0,
        'screenshots_count': game.igdb_screenshots_count if game.igdb_screenshots_count is not None else 0,
        'stores': stores,
        'trailers': trailers,
        'screenshots': screenshots,
        'red_tigerino_playlist_url': game.red_tigerino_playlist_url,
    }

    if hltb_game is not None:
        translate_hltb_time(hltb_game, 'main_story', 'gameplay_main', 'gameplay_main_unit')
        translate_hltb_time(hltb_game, 'main_extra', 'gameplay_main_extra', 'gameplay_main_extra_unit')
        translate_hltb_time(hltb_game, 'completionist', 'gameplay_completionist', 'gameplay_completionist_unit')
        new_game.update({'hltb': hltb_game})

    return new_game


async def parse_game_prices_from_db(game: Game, steam_region='ru'):
    prices = []
    game_stores = GameStore.objects.filter(game=game).select_related('store')

    async for game_store in game_stores:
        if game_store.store.igdb_slug != 'steam':
            continue

        try:
            steam_price = await sync_to_async(get_steam_store_price)(game_store.url, steam_region)
        except Exception:
            steam_price = None

        if not steam_price:
            continue

        prices.append({
            'store': {
                'id': game_store.store.igdb_id,
                'name': game_store.store.igdb_name,
                'slug': game_store.store.igdb_slug,
            },
            'url': game_store.url,
            'region': steam_region,
            'region_label': get_steam_region_label(steam_region),
            'currency': steam_price.get('currency'),
            'final': steam_price.get('final'),
            'initial': steam_price.get('initial'),
            'discount_percent': steam_price.get('discount_percent'),
            'formatted_final': steam_price.get('formatted_final'),
            'formatted_initial': steam_price.get('formatted_initial'),
        })

    try:
        igm_price = await sync_to_async(get_igm_store_price)(game.igdb_slug, game.igdb_name, steam_region)
    except Exception:
        igm_price = None

    if igm_price:
        igm_store = get_igm_store_info()
        prices.append({
            'store': {
                'id': igm_store['id'],
                'name': igm_store['name'],
                'slug': igm_store['slug'],
            },
            'url': igm_price.get('url') or '',
            'region': steam_region,
            'region_label': '',
            'currency': igm_price.get('currency'),
            'final': igm_price.get('final'),
            'initial': igm_price.get('initial'),
            'discount_percent': igm_price.get('discount_percent'),
            'formatted_final': igm_price.get('formatted_final'),
            'formatted_initial': igm_price.get('formatted_initial'),
        })

    try:
        plati_price = await sync_to_async(get_plati_store_price)(game.igdb_name)
    except Exception:
        plati_price = None

    if plati_price:
        plati_store = get_plati_store_info()
        prices.append({
            'store': {
                'id': plati_store['id'],
                'name': plati_store['name'],
                'slug': plati_store['slug'],
            },
            'url': plati_price.get('url') or '',
            'region': '',
            'region_label': '',
            'currency': plati_price.get('currency'),
            'final': plati_price.get('final'),
            'initial': plati_price.get('initial'),
            'discount_percent': plati_price.get('discount_percent'),
            'formatted_final': plati_price.get('formatted_final'),
            'formatted_initial': plati_price.get('formatted_initial'),
        })

    return {
        'slug': game.igdb_slug or '',
        'items': prices,
    }
