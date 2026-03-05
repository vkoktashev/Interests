import json
import os
import time
from datetime import datetime
from difflib import SequenceMatcher
from typing import Any, Optional
from urllib.parse import urlparse

import requests
from igdb.wrapper import IGDBWrapper
from django.utils import timezone

from games.models import Game, GameDeveloper, GameGenre, GameScreenshot, GameStore, GameTrailer, Genre, Store
from people.models import Developer
from utils.functions import objects_to_str, update_fields_if_needed_async

TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
IGDB_API_TIMEOUT = 8

_token_cache: dict[str, Any] = {
    'access_token': None,
    'expires_at': 0.0,
}

# Slugs are aligned with frontend GameStoresEnum.
IGDB_STORE_BY_CATEGORY = {
    10: {'id': 10, 'slug': 'apple-appstore', 'name': 'App Store'},
    11: {'id': 11, 'slug': 'apple-appstore', 'name': 'App Store'},
    12: {'id': 12, 'slug': 'google-play', 'name': 'Google Play'},
    13: {'id': 13, 'slug': 'steam', 'name': 'Steam'},
    15: {'id': 15, 'slug': 'itch', 'name': 'itch.io'},
    16: {'id': 16, 'slug': 'epic-games', 'name': 'Epic Games'},
    17: {'id': 17, 'slug': 'gog', 'name': 'GOG'},
}

IGDB_STORE_BY_HOST = (
    ('store.steampowered.com', {'id': 13, 'slug': 'steam', 'name': 'Steam'}),
    ('epicgames.com', {'id': 16, 'slug': 'epic-games', 'name': 'Epic Games'}),
    ('gog.com', {'id': 17, 'slug': 'gog', 'name': 'GOG'}),
    ('store.playstation.com', {'id': 101, 'slug': 'playstation-store', 'name': 'PlayStation Store'}),
    ('playstation.com', {'id': 101, 'slug': 'playstation-store', 'name': 'PlayStation Store'}),
    ('xbox.com', {'id': 102, 'slug': 'xbox-store', 'name': 'Xbox Store'}),
    ('nintendo.com', {'id': 103, 'slug': 'nintendo', 'name': 'Nintendo eShop'}),
    ('apps.apple.com', {'id': 10, 'slug': 'apple-appstore', 'name': 'App Store'}),
    ('play.google.com', {'id': 12, 'slug': 'google-play', 'name': 'Google Play'}),
    ('itch.io', {'id': 15, 'slug': 'itch', 'name': 'itch.io'}),
)


def _normalize(value: str | None) -> str:
    if not value:
        return ''
    return ''.join(ch.lower() for ch in value if ch.isalnum() or ch.isspace()).strip()


def _get_env(name: str, fallback: str | None = None) -> str | None:
    value = os.environ.get(name)
    if value:
        return value
    if fallback:
        return os.environ.get(fallback)
    return None


def get_igdb_access_token() -> str:
    now = time.time()
    cached = _token_cache.get('access_token')
    expires_at = float(_token_cache.get('expires_at') or 0)
    if cached and now < expires_at - 60:
        return cached

    client_id = _get_env('IGDB_CLIENT_ID', 'TWITCH_CLIENT_ID')
    client_secret = _get_env('IGDB_CLIENT_SECRET', 'TWITCH_CLIENT_SECRET')
    if not client_id or not client_secret:
        raise RuntimeError('IGDB credentials are missing: set IGDB_CLIENT_ID and IGDB_CLIENT_SECRET in .env')

    response = requests.post(
        TWITCH_TOKEN_URL,
        params={
            'client_id': client_id,
            'client_secret': client_secret,
            'grant_type': 'client_credentials',
        },
        timeout=IGDB_API_TIMEOUT,
    )
    response.raise_for_status()

    payload = response.json()
    access_token = payload.get('access_token')
    expires_in = int(payload.get('expires_in') or 0)
    if not access_token:
        raise RuntimeError('Unable to obtain IGDB access token')

    _token_cache['access_token'] = access_token
    _token_cache['expires_at'] = now + expires_in
    return access_token


def get_igdb_wrapper() -> IGDBWrapper:
    client_id = _get_env('IGDB_CLIENT_ID', 'TWITCH_CLIENT_ID')
    if not client_id:
        raise RuntimeError('IGDB client id is missing: set IGDB_CLIENT_ID in .env')
    access_token = get_igdb_access_token()
    return IGDBWrapper(client_id, access_token)


def query_igdb_games(query: str, limit: int = 20) -> list[dict[str, Any]]:
    wrapper = get_igdb_wrapper()
    safe_query = (query or '').replace('"', '\\"')
    body = (
        f'search "{safe_query}"; '
        f'fields id,name,slug,category,game_type,first_release_date,aggregated_rating,total_rating,'
        f'rating_count,cover.url,url; '
        f'limit {max(1, min(limit, 50))};'
    )
    raw = wrapper.api_request('games', body)
    if not raw:
        return []
    return json.loads(raw.decode('utf-8'))


def _format_igdb_cover_url(url: str | None) -> str:
    if not url:
        return ''
    result = url.strip()
    if result.startswith('//'):
        result = f'https:{result}'
    result = result.replace('/t_thumb/', '/t_cover_big/')
    return result


def _format_igdb_image_url(url: str | None) -> str:
    if not url:
        return ''
    result = url.strip()
    if result.startswith('//'):
        result = f'https:{result}'
    return result.replace('/t_thumb/', '/t_1080p/')


def _format_igdb_release_date(value: Any) -> str | None:
    if not isinstance(value, int):
        return None
    try:
        return datetime.utcfromtimestamp(value).strftime('%Y-%m-%d')
    except (OSError, OverflowError, ValueError):
        return None


def _parse_igdb_release_date(value: Any):
    if not isinstance(value, int):
        return None
    try:
        return datetime.utcfromtimestamp(value).date()
    except (OSError, OverflowError, ValueError):
        return None


def _resolve_store_info(url: str, category: int | None) -> dict[str, Any] | None:
    if not url:
        return None

    store_info = IGDB_STORE_BY_CATEGORY.get(category)

    host = (urlparse(url).netloc or '').lower()
    for host_part, host_store_info in IGDB_STORE_BY_HOST:
        if host_part in host:
            store_info = host_store_info
            break

    if not store_info:
        return None

    return {
        'id': store_info['id'],
        'slug': store_info['slug'],
        'name': store_info['name'],
        'url': url,
    }


def get_game_search_results(query: str, page: int, page_size: int) -> list[dict[str, Any]]:
    safe_page = max(int(page or 1), 1)
    safe_page_size = max(int(page_size or 12), 1)
    if not (query or '').strip():
        return []

    offset = (safe_page - 1) * safe_page_size
    wrapper = get_igdb_wrapper()
    safe_query = (query or '').replace('\\', '\\\\').replace('"', '\\"')
    body = (
        f'search "{safe_query}"; '
        f'fields id,name,slug,category,game_type,first_release_date,cover.url,genres.name,platforms.name,keywords.name; '
        f'limit {safe_page_size}; '
        f'offset {offset};'
    )
    raw = wrapper.api_request('games', body)
    if not raw:
        return []

    games = json.loads(raw.decode('utf-8')) or []
    if not games:
        # Fallback 1: simpler IGDB search payload can return matches when rich payload returns empty.
        try:
            games = query_igdb_games(query, limit=max(safe_page_size, 20))
        except Exception:
            games = []

    if not games:
        # Fallback 2: exact slug lookup (e.g. "Until Then" -> "until-then").
        slug_candidate = '-'.join((query or '').strip().lower().split())
        if slug_candidate:
            try:
                slug_game = query_igdb_game_by_slug(slug_candidate)
            except Exception:
                slug_game = None
            if slug_game:
                games = [slug_game]

    if safe_page > 1:
        offset = (safe_page - 1) * safe_page_size
        games = games[offset: offset + safe_page_size]
    else:
        games = games[:safe_page_size]

    result = []
    for game in games or []:
        game_category = game.get('category')
        if game_category is None:
            game_category = game.get('game_type')
        platforms = [{'platform': {'name': (item or {}).get('name', '')}} for item in (game.get('platforms') or [])]
        genres = [{'name': (item or {}).get('name', '')} for item in (game.get('genres') or [])]
        tags = [{'name': (item or {}).get('name', '')} for item in (game.get('keywords') or [])]
        result.append({
            'id': game.get('id'),
            'name': game.get('name') or '',
            'slug': game.get('slug') or '',
            'category': game_category,
            'background_image': _format_igdb_cover_url((game.get('cover') or {}).get('url')),
            'released': _format_igdb_release_date(game.get('first_release_date')),
            'genres': genres,
            'tags': tags,
            'platforms': platforms,
        })
    return result


def query_igdb_game_by_id(igdb_id: int) -> Optional[dict[str, Any]]:
    wrapper = get_igdb_wrapper()
    body = (
        f'fields id,name,slug,category,first_release_date,summary,rating,rating_count,aggregated_rating,'
        f'aggregated_rating_count,cover.url,url,platforms.name,genres.id,genres.name,genres.slug,'
        f'involved_companies.developer,involved_companies.company.id,involved_companies.company.name,'
        f'videos.name,videos.video_id,screenshots.id,screenshots.url,screenshots.width,screenshots.height,'
        f'websites.id,websites.url,websites.category; '
        f'where id = {int(igdb_id)}; '
        f'limit 1;'
    )
    raw = wrapper.api_request('games', body)
    if not raw:
        return None
    items = json.loads(raw.decode('utf-8')) or []
    return items[0] if items else None


def query_igdb_game_by_slug(slug: str) -> Optional[dict[str, Any]]:
    wrapper = get_igdb_wrapper()
    safe_slug = (slug or '').replace('\\', '\\\\').replace('"', '\\"')
    body = (
        f'fields id,name,slug,category,first_release_date,summary,rating,rating_count,aggregated_rating,'
        f'aggregated_rating_count,cover.url,url,platforms.name,genres.id,genres.name,genres.slug,'
        f'involved_companies.developer,involved_companies.company.id,involved_companies.company.name,'
        f'videos.name,videos.video_id,screenshots.id,screenshots.url,screenshots.width,screenshots.height,'
        f'websites.id,websites.url,websites.category; '
        f'where slug = "{safe_slug}"; '
        f'limit 1;'
    )
    raw = wrapper.api_request('games', body)
    if not raw:
        return None
    items = json.loads(raw.decode('utf-8')) or []
    return items[0] if items else None


def resolve_igdb_game_details(game: Optional[Game], requested_slug: str) -> Optional[dict[str, Any]]:
    if game and game.igdb_id:
        item = query_igdb_game_by_id(game.igdb_id)
        if item:
            return item

    if game and game.igdb_slug:
        item = query_igdb_game_by_slug(game.igdb_slug)
        if item:
            return item

    item = query_igdb_game_by_slug(requested_slug)
    if item:
        return item

    fallback_name = (game.igdb_name if game else '')
    if fallback_name:
        candidates = query_igdb_games(fallback_name, limit=20)
        release_year = None
        if game and game.igdb_release_date:
            release_year = game.igdb_release_date.year
        ranked = rank_igdb_matches(fallback_name, requested_slug, release_year, candidates)
        if ranked and ranked[0].get('score', 0) >= 70:
            return ranked[0].get('candidate')

    return None


def get_igdb_game_new_fields(igdb_game: dict[str, Any]) -> dict[str, Any]:
    platforms = objects_to_str(igdb_game.get('platforms') or [])
    first_release_date = _parse_igdb_release_date(igdb_game.get('first_release_date'))
    release_year = first_release_date.year if first_release_date else None
    videos_count = len(igdb_game.get('videos') or [])
    screenshots_count = len(igdb_game.get('screenshots') or [])
    cover_url = _format_igdb_cover_url((igdb_game.get('cover') or {}).get('url'))
    return {
        'igdb_id': igdb_game.get('id'),
        'igdb_name': igdb_game.get('name') or '',
        'igdb_slug': igdb_game.get('slug') or '',
        'igdb_year': release_year,
        'igdb_release_date': first_release_date,
        'igdb_summary': igdb_game.get('summary') or '',
        'igdb_rating': igdb_game.get('rating'),
        'igdb_rating_count': igdb_game.get('rating_count'),
        'igdb_aggregated_rating': igdb_game.get('aggregated_rating'),
        'igdb_aggregated_rating_count': igdb_game.get('aggregated_rating_count'),
        'igdb_cover_url': cover_url,
        'igdb_platforms': platforms,
        'igdb_videos_count': videos_count,
        'igdb_screenshots_count': screenshots_count,
        'igdb_url': igdb_game.get('url') or '',
        'igdb_last_update': timezone.now(),
    }


async def update_game_genres_from_igdb(game: Game, igdb_game: dict[str, Any]) -> None:
    existing_links = GameGenre.objects.filter(game=game)
    new_links = []
    to_delete_ids = []

    for genre in igdb_game.get('genres') or []:
        genre_id = genre.get('id')
        if genre_id is None:
            continue
        genre_obj, _ = await Genre.objects.aget_or_create(
            igdb_id=genre_id,
            defaults={
                'igdb_name': genre.get('name') or '',
                'igdb_slug': (genre.get('slug') or ''),
            },
        )
        update_fields = {}
        if genre.get('name') and genre_obj.igdb_name != genre.get('name'):
            update_fields['igdb_name'] = genre.get('name')
        if genre.get('slug') and genre_obj.igdb_slug != genre.get('slug'):
            update_fields['igdb_slug'] = genre.get('slug')
        if update_fields:
            for key, value in update_fields.items():
                setattr(genre_obj, key, value)
            await genre_obj.asave(update_fields=tuple(update_fields.keys()))

        link, _ = await GameGenre.objects.aget_or_create(game=game, genre=genre_obj)
        new_links.append(link)

    async for existing_link in existing_links:
        if existing_link not in new_links:
            to_delete_ids.append(existing_link.id)
    if to_delete_ids:
        await GameGenre.objects.filter(id__in=to_delete_ids).adelete()


async def update_game_developers_from_igdb(game: Game, igdb_game: dict[str, Any]) -> None:
    existing_links = GameDeveloper.objects.filter(game=game).select_related('developer')
    new_links = []
    to_delete_ids = []

    for index, involved in enumerate(igdb_game.get('involved_companies') or []):
        if not involved.get('developer'):
            continue
        company = involved.get('company') or {}
        developer_id = company.get('id')
        developer_name = company.get('name')
        if developer_id is None or not developer_name:
            continue

        developer_obj, _ = await Developer.objects.aget_or_create(
            igdb_id=developer_id,
            defaults={'name': developer_name},
        )
        if developer_obj.name != developer_name:
            developer_obj.name = developer_name
            await developer_obj.asave(update_fields=('name',))

        link, _ = await GameDeveloper.objects.aget_or_create(
            game=game,
            developer=developer_obj,
            defaults={'sort_order': index},
        )
        if link.sort_order != index:
            link.sort_order = index
            await link.asave(update_fields=('sort_order',))
        new_links.append(link)

    async for existing_link in existing_links:
        if existing_link not in new_links:
            to_delete_ids.append(existing_link.id)
    if to_delete_ids:
        await GameDeveloper.objects.filter(id__in=to_delete_ids).adelete()


async def update_game_media_from_igdb(game: Game, igdb_game: dict[str, Any]) -> None:
    videos = igdb_game.get('videos') or []
    screenshots = igdb_game.get('screenshots') or []

    existing_trailers = GameTrailer.objects.filter(game=game)
    new_trailers = []
    trailers_to_delete = []
    for index, video in enumerate(videos):
        video_item_id = video.get('id')
        video_id = video.get('video_id')
        if not video_id:
            continue
        trailer_url = f'https://www.youtube.com/watch?v={video_id}'
        trailer = await GameTrailer.objects.filter(game=game, igdb_video_id=video_id).afirst()
        if trailer is None:
            trailer = await GameTrailer.objects.acreate(
                game=game,
                url=trailer_url,
                sort_order=index,
                igdb_id=video_item_id,
                igdb_video_id=video_id,
            )
        await update_fields_if_needed_async(trailer, {
            'name': video.get('name') or '',
            'url': trailer_url,
            'sort_order': index,
            'igdb_id': video_item_id,
            'igdb_video_id': video_id,
        })
        new_trailers.append(trailer)

    async for existing_trailer in existing_trailers:
        if existing_trailer not in new_trailers:
            trailers_to_delete.append(existing_trailer.id)
    if trailers_to_delete:
        await GameTrailer.objects.filter(id__in=trailers_to_delete).adelete()

    existing_screenshots = GameScreenshot.objects.filter(game=game)
    new_screenshots = []
    screenshots_to_delete = []
    for index, screenshot in enumerate(screenshots):
        image_url = _format_igdb_image_url(screenshot.get('url'))
        if not image_url:
            continue
        game_screenshot = await GameScreenshot.objects.filter(game=game, image=image_url).afirst()
        if game_screenshot is None:
            game_screenshot = await GameScreenshot.objects.acreate(
                game=game,
                image=image_url,
                sort_order=index,
                igdb_id=screenshot.get('id'),
            )
        await update_fields_if_needed_async(game_screenshot, {
            'igdb_id': screenshot.get('id'),
            'image': image_url,
            'width': screenshot.get('width'),
            'height': screenshot.get('height'),
            'sort_order': index,
        })
        new_screenshots.append(game_screenshot)

    async for existing_screenshot in existing_screenshots:
        if existing_screenshot not in new_screenshots:
            screenshots_to_delete.append(existing_screenshot.id)
    if screenshots_to_delete:
        await GameScreenshot.objects.filter(id__in=screenshots_to_delete).adelete()


async def update_game_stores_from_igdb(game: Game, igdb_game: dict[str, Any]) -> None:
    websites = igdb_game.get('websites') or []

    resolved_stores = []
    seen_store_slugs = set()
    for website in websites:
        website_url = (website.get('url') or '').strip()
        website_category = website.get('category')
        resolved = _resolve_store_info(website_url, website_category)
        if not resolved:
            continue
        if resolved['slug'] in seen_store_slugs:
            continue
        seen_store_slugs.add(resolved['slug'])
        resolved_stores.append(resolved)

    existing_links = GameStore.objects.filter(game=game).select_related('store')
    new_links = []
    to_delete_ids = []

    for store_info in resolved_stores:
        store = await Store.objects.filter(igdb_slug=store_info['slug']).afirst()
        if store is None:
            store = await Store.objects.filter(igdb_id=store_info['id']).afirst()
        if store is None:
            store = await Store.objects.acreate(
                igdb_id=store_info['id'],
                igdb_name=store_info['name'],
                igdb_slug=store_info['slug'],
            )
        else:
            await update_fields_if_needed_async(store, {
                'igdb_name': store_info['name'],
                'igdb_slug': store_info['slug'],
            })

        game_store = await GameStore.objects.filter(game=game, store=store).afirst()
        if game_store is None:
            game_store = await GameStore.objects.acreate(
                game=game,
                store=store,
                url=store_info['url'],
            )
        else:
            await update_fields_if_needed_async(game_store, {'url': store_info['url']})
        new_links.append(game_store)

    async for existing_link in existing_links:
        if existing_link not in new_links:
            to_delete_ids.append(existing_link.id)
    if to_delete_ids:
        await GameStore.objects.filter(id__in=to_delete_ids).adelete()


def rank_igdb_matches(
    game_name: str,
    game_slug: str | None,
    game_release_year: int | None,
    candidates: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    normalized_name = _normalize(game_name)
    normalized_slug = _normalize((game_slug or '').replace('-', ' '))
    ranked: list[dict[str, Any]] = []

    for candidate in candidates:
        candidate_name = candidate.get('name') or ''
        candidate_slug = candidate.get('slug') or ''
        candidate_name_norm = _normalize(candidate_name)
        candidate_slug_norm = _normalize(candidate_slug.replace('-', ' '))

        name_ratio = SequenceMatcher(None, normalized_name, candidate_name_norm).ratio()
        slug_ratio = SequenceMatcher(None, normalized_slug, candidate_slug_norm).ratio() if normalized_slug else 0.0
        score = max(name_ratio, slug_ratio) * 100

        ts = candidate.get('first_release_date')
        candidate_year = None
        if isinstance(ts, int):
            candidate_year = time.gmtime(ts).tm_year

        if game_release_year is not None and candidate_year is not None:
            score -= min(abs(game_release_year - candidate_year) * 4, 20)

        ranked.append({
            'score': round(score, 2),
            'candidate': candidate,
            'release_year': candidate_year,
            'name_ratio': round(name_ratio, 4),
            'slug_ratio': round(slug_ratio, 4),
        })

    return sorted(ranked, key=lambda item: item['score'], reverse=True)
