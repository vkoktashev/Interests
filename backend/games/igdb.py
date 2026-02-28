import json
import os
import time
from difflib import SequenceMatcher
from typing import Any

import requests
from igdb.wrapper import IGDBWrapper

TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token'
IGDB_API_TIMEOUT = 8

_token_cache: dict[str, Any] = {
    'access_token': None,
    'expires_at': 0.0,
}


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
        f'fields id,name,slug,first_release_date,aggregated_rating,total_rating,'
        f'rating_count,cover.url,url; '
        f'limit {max(1, min(limit, 50))};'
    )
    raw = wrapper.api_request('games', body)
    if not raw:
        return []
    return json.loads(raw.decode('utf-8'))


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
