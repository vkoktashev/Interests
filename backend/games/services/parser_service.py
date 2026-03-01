from datetime import date

from games.models import Game, GameDeveloper, GameGenre, GameScreenshot, GameStore, GameTrailer
from games.integrations.hltb import translate_hltb_time
from utils.functions import int_to_hours, objects_to_str


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


def parse_game(rawg_game, hltb_game=None):
    platforms = [obj['platform'] for obj in rawg_game['platforms']]

    new_game = {
        'name': rawg_game.get('name'),
        'slug': rawg_game.get('slug'),
        'overview': rawg_game.get('description'),
        'metacritic': rawg_game.get('metacritic'),
        'genres': objects_to_str(rawg_game['genres']),
        'developers': objects_to_str(rawg_game['developers']),
        'platforms': objects_to_str(platforms),
        'background': rawg_game.get('background_image_additional')
        if rawg_game.get('background_image_additional') is not None
        else rawg_game.get('background_image'),
        'poster': rawg_game.get('background_image'),
        'release_date': '.'.join(reversed(rawg_game['released'].split('-')))
        if rawg_game.get('released') is not None else None,
        'playtime': f'{rawg_game.get("playtime")} {int_to_hours(rawg_game.get("playtime"))}',
        'stores': rawg_game.get('stores'),
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
            'id': game_genre.genre.rawg_id,
            'name': game_genre.genre.rawg_name,
            'slug': game_genre.genre.rawg_slug,
        })

    stores = []
    game_stores = GameStore.objects.filter(game=game).select_related('store')
    async for game_store in game_stores:
        stores.append({
            'store': {
                'id': game_store.store.rawg_id,
                'name': game_store.store.rawg_name,
                'slug': game_store.store.rawg_slug,
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
            'id': game_trailer.rawg_id,
            'name': game_trailer.name,
            'preview': game_trailer.preview,
            'url': game_trailer.url,
            'data': {
                'max': game_trailer.video_max,
                '480': game_trailer.video_480,
                '320': game_trailer.video_320,
            },
        })

    screenshots = []
    game_screenshots = GameScreenshot.objects.filter(game=game).order_by('sort_order', 'id')
    async for game_screenshot in game_screenshots:
        screenshots.append({
            'id': game_screenshot.rawg_id,
            'image': game_screenshot.image,
            'width': game_screenshot.width,
            'height': game_screenshot.height,
        })

    new_game = {
        'id': game.id,
        'name': game.rawg_name,
        'slug': game.rawg_slug,
        'overview': game.rawg_description,
        'metacritic': game.rawg_metacritic,
        'genres': objects_to_str(genres),
        'developers': objects_to_str(developers),
        'platforms': game.rawg_platforms,
        'background': game.rawg_backdrop_path,
        'poster': game.rawg_poster_path,
        'release_date': format_game_release_date(game.rawg_release_date),
        'playtime': f'{game.rawg_playtime} {int_to_hours(game.rawg_playtime)}',
        'movies_count': game.rawg_movies_count if game.rawg_movies_count is not None else 0,
        'screenshots_count': game.rawg_screenshots_count if game.rawg_screenshots_count is not None else 0,
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
