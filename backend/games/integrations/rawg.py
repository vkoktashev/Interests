from json import JSONDecodeError
from typing import Any, List, Optional

from django.core.cache import cache

from games.functions import get_rawg_game_key
from games.models import Game, GameDeveloper, GameGenre, GameScreenshot, GameStore, GameTrailer, Genre, Store
from people.models import Developer
from utils.constants import CACHE_TIMEOUT, rawg
from utils.functions import update_fields_if_needed_async


def get_rawg_count(value):
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


async def update_game_genres(game: Game, rawg_game: dict) -> None:
    existing_game_genres = GameGenre.objects.filter(game=game)
    new_game_genres = []
    game_genres_to_delete_ids = []

    for genre in rawg_game.get('genres'):
        genre_obj, _ = await Genre.objects.aget_or_create(
            rawg_id=genre.get('id'),
            defaults={
                'rawg_name': genre.get('name'),
                'rawg_slug': genre.get('slug'),
            },
        )
        game_genre_obj, _ = await GameGenre.objects.aget_or_create(genre=genre_obj, game=game)
        new_game_genres.append(game_genre_obj)

    async for existing_game_genre in existing_game_genres:
        if existing_game_genre not in new_game_genres:
            game_genres_to_delete_ids.append(existing_game_genre.id)

    await GameGenre.objects.filter(id__in=game_genres_to_delete_ids).adelete()


async def update_game_stores(game: Game, rawg_game: dict) -> None:
    existing_game_stores = GameStore.objects.filter(game=game)
    new_game_stores = []
    game_stores_to_delete_ids = []
    stores = rawg.get_stores(rawg_game.get('slug'))

    for game_store in rawg_game.get('stores'):
        store = game_store['store']
        store_obj, _ = await Store.objects.aget_or_create(
            rawg_id=store.get('id'),
            defaults={
                'rawg_name': store.get('name'),
                'rawg_slug': store.get('slug'),
            },
        )
        game_store_url = find_game_store_url(stores, store_obj)
        game_store_obj, _ = await GameStore.objects.aget_or_create(
            store=store_obj,
            game=game,
            defaults={'url': game_store_url},
        )
        if game_store_obj.url != game_store_url:
            game_store_obj.url = game_store_url
            await game_store_obj.asave(update_fields=('url',))

        new_game_stores.append(game_store_obj)

    async for existing_game_store in existing_game_stores:
        if existing_game_store not in new_game_stores:
            game_stores_to_delete_ids.append(existing_game_store.id)

    await GameStore.objects.filter(id__in=game_stores_to_delete_ids).adelete()


async def update_game_developers(game: Game, rawg_game: dict) -> None:
    existing_links = GameDeveloper.objects.filter(game=game).select_related('developer')
    new_links = []
    links_to_delete_ids = []

    for index, developer in enumerate(rawg_game.get('developers') or []):
        developer_id = developer.get('id')
        developer_name = developer.get('name')
        if developer_id is None or not developer_name:
            continue

        developer_obj, _ = await Developer.objects.aget_or_create(
            rawg_id=developer_id,
            defaults={'name': developer_name},
        )
        if developer_obj.name != developer_name:
            developer_obj.name = developer_name
            await developer_obj.asave(update_fields=('name',))

        game_developer, _ = await GameDeveloper.objects.aget_or_create(
            game=game,
            developer=developer_obj,
            defaults={'sort_order': index},
        )
        if game_developer.sort_order != index:
            game_developer.sort_order = index
            await game_developer.asave(update_fields=('sort_order',))
        new_links.append(game_developer)

    async for existing_link in existing_links:
        if existing_link not in new_links:
            links_to_delete_ids.append(existing_link.id)

    await GameDeveloper.objects.filter(id__in=links_to_delete_ids).adelete()


async def update_game_trailers(game: Game, rawg_trailers: List[dict]) -> None:
    existing_trailers = GameTrailer.objects.filter(game=game)
    new_trailers = []
    trailers_to_delete_ids = []

    for index, trailer in enumerate(rawg_trailers or []):
        trailer_id = trailer.get('id')
        if trailer_id is not None:
            game_trailer, _ = await GameTrailer.objects.aget_or_create(
                game=game,
                rawg_id=trailer_id,
                defaults={'sort_order': index},
            )
        else:
            trailer_url = trailer.get('url') or ''
            if not trailer_url:
                continue
            game_trailer = await GameTrailer.objects.filter(game=game, url=trailer_url).afirst()
            if game_trailer is None:
                game_trailer = await GameTrailer.objects.acreate(game=game, url=trailer_url, sort_order=index)

        new_fields = {
            'name': trailer.get('name') or '',
            'preview': trailer.get('preview') or '',
            'url': trailer.get('url') or '',
            'video_max': (trailer.get('data') or {}).get('max') or '',
            'video_480': (trailer.get('data') or {}).get('480') or '',
            'video_320': (trailer.get('data') or {}).get('320') or '',
            'sort_order': index,
        }
        await update_fields_if_needed_async(game_trailer, new_fields)
        new_trailers.append(game_trailer)

    async for existing_trailer in existing_trailers:
        if existing_trailer not in new_trailers:
            trailers_to_delete_ids.append(existing_trailer.id)

    await GameTrailer.objects.filter(id__in=trailers_to_delete_ids).adelete()
    await update_fields_if_needed_async(game, {'rawg_movies_count': len(rawg_trailers or [])})


async def update_game_screenshots(game: Game, rawg_screenshots: List[dict]) -> None:
    existing_screenshots = GameScreenshot.objects.filter(game=game)
    new_screenshots = []
    screenshots_to_delete_ids = []

    for index, screenshot in enumerate(rawg_screenshots or []):
        screenshot_id = screenshot.get('id')
        if screenshot_id is not None:
            game_screenshot, _ = await GameScreenshot.objects.aget_or_create(
                game=game,
                rawg_id=screenshot_id,
                defaults={'sort_order': index},
            )
        else:
            image_url = screenshot.get('image') or ''
            if not image_url:
                continue
            game_screenshot = await GameScreenshot.objects.filter(game=game, image=image_url).afirst()
            if game_screenshot is None:
                game_screenshot = await GameScreenshot.objects.acreate(game=game, image=image_url, sort_order=index)

        new_fields = {
            'image': screenshot.get('image') or '',
            'width': screenshot.get('width'),
            'height': screenshot.get('height'),
            'sort_order': index,
        }
        await update_fields_if_needed_async(game_screenshot, new_fields)
        new_screenshots.append(game_screenshot)

    async for existing_screenshot in existing_screenshots:
        if existing_screenshot not in new_screenshots:
            screenshots_to_delete_ids.append(existing_screenshot.id)

    await GameScreenshot.objects.filter(id__in=screenshots_to_delete_ids).adelete()
    await update_fields_if_needed_async(game, {'rawg_screenshots_count': len(rawg_screenshots or [])})


def find_game_store_url(game_stores: List[Any], store_obj: Store) -> Optional[str]:
    for game_store in game_stores:
        if store_obj.rawg_id == game_store.store_id:
            return game_store.url
    return None


def get_game_search_results(query, page, page_size):
    key = f'tmdb_game_search_{query.replace(" ", "_")}_page_{page}_page_size_{page_size}'
    results = cache.get(key, None)
    if results is None:
        search_result = rawg.search(query, num_results=page_size, additional_param=f"&page={page}")
        results = [game.json for game in search_result]
        cache.set(key, results, CACHE_TIMEOUT)
    return results


def get_rawg_game(slug):
    returned_from_cache = True
    key = get_rawg_game_key(slug)
    # rawg_game = cache.get(key, None)
    rawg_game = None
    if rawg_game is None:
        rawg_game = rawg.game_request(slug)
        if not isinstance(rawg_game, dict):
            raise ValueError('Unexpected RAWG response type')

        if not rawg_game.get('slug'):
            error_message = str(rawg_game.get('detail') or rawg_game.get('error') or '').lower()
            if 'not found' in error_message:
                raise KeyError(slug)
            raise ValueError(f'RAWG error response: {rawg_game}')

        cache.set(key, rawg_game, CACHE_TIMEOUT)
        returned_from_cache = False

    return rawg_game, returned_from_cache
