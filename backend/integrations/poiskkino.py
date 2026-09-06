from dataclasses import dataclass
import logging
import os
import time

import requests

from integrations.exceptions import ExternalUnavailableError
from integrations.http import external_request


POISKKINO_PROVIDER = 'poiskkino.dev'
POISKKINO_MOVIES_URL = 'https://api.poiskkino.dev/v1.5/movie'
POISKKINO_PAGE_SIZE = 10
POISKKINO_MAX_PAGES_PER_BATCH = 10
POISKKINO_MAX_BATCHES = 3
POISKKINO_CONNECT_TIMEOUT_SECS = 20
POISKKINO_READ_TIMEOUT_SECS = 30
POISKKINO_REQUEST_ATTEMPTS = 3

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PoiskkinoRankedMovie:
    position: int
    kinopoisk_id: int | None
    tmdb_id: int | None
    imdb_id: str | None
    name: str | None
    alternative_name: str | None
    year: int | None


def get_kinopoisk_top250():
    api_key = os.environ.get('POISKKINO_API_KEY')
    if not api_key:
        raise ExternalUnavailableError(
            POISKKINO_PROVIDER,
            message='POISKKINO_API_KEY is not configured',
        )

    with requests.Session() as session:
        session.headers.update({'X-API-KEY': api_key})
        ranked_movies = _load_ranked_movies(session)

    return [ranked_movies[position] for position in sorted(ranked_movies)]


def _load_ranked_movies(session):
    ranked_movies = {}
    excluded_kinopoisk_ids = set()
    for _ in range(POISKKINO_MAX_BATCHES):
        batch_movies = _load_ranked_movies_batch(session, excluded_kinopoisk_ids)
        if not batch_movies:
            break

        previous_count = len(ranked_movies)
        for position, ranked_movie in batch_movies.items():
            ranked_movies.setdefault(position, ranked_movie)
            excluded_kinopoisk_ids.add(ranked_movie.kinopoisk_id)
        if len(ranked_movies) == previous_count:
            raise ExternalUnavailableError(
                POISKKINO_PROVIDER,
                message='poiskkino.dev repeated an already loaded Top 250 batch',
            )
        if len(ranked_movies) >= 250:
            break
    return ranked_movies


def _load_ranked_movies_batch(session, excluded_kinopoisk_ids):
    ranked_movies = {}
    cursor = None
    seen_cursors = set()
    for _ in range(POISKKINO_MAX_PAGES_PER_BATCH):
        params = [
            ('limit', POISKKINO_PAGE_SIZE),
            ('notNullFields', 'top250'),
            ('sortField', 'top250'),
            ('sortType', '1'),
            ('selectFields', 'id'),
            ('selectFields', 'name'),
            ('selectFields', 'alternativeName'),
            ('selectFields', 'year'),
            ('selectFields', 'externalId'),
            ('selectFields', 'top250'),
        ]
        params.extend(
            ('id', f'!{kinopoisk_id}')
            for kinopoisk_id in sorted(excluded_kinopoisk_ids)
        )
        if cursor is not None:
            params.append(('next', cursor))

        payload = _request_page(session, params)
        docs = payload.get('docs') if isinstance(payload, dict) else None
        if not isinstance(docs, list):
            raise ExternalUnavailableError(
                POISKKINO_PROVIDER,
                message='poiskkino.dev returned an unexpected response',
            )

        for movie_data in docs:
            ranked_movie = _parse_ranked_movie(movie_data)
            if ranked_movie is not None:
                if ranked_movie.kinopoisk_id is None:
                    raise ExternalUnavailableError(
                        POISKKINO_PROVIDER,
                        message='poiskkino.dev returned a Top 250 movie without an id',
                    )
                ranked_movies.setdefault(ranked_movie.position, ranked_movie)

        if not payload.get('hasNext'):
            break
        next_cursor = payload.get('next')
        if not isinstance(next_cursor, str) or not next_cursor or next_cursor in seen_cursors:
            raise ExternalUnavailableError(
                POISKKINO_PROVIDER,
                message='poiskkino.dev returned an invalid pagination cursor',
            )
        seen_cursors.add(next_cursor)
        cursor = next_cursor
    return ranked_movies


def _request_page(session, params):
    for attempt in range(1, POISKKINO_REQUEST_ATTEMPTS + 1):
        try:
            response = external_request(
                POISKKINO_PROVIDER,
                'GET',
                POISKKINO_MOVIES_URL,
                timeout=(POISKKINO_CONNECT_TIMEOUT_SECS, POISKKINO_READ_TIMEOUT_SECS),
                session=session,
                params=params,
            )
            try:
                return response.json()
            except ValueError as error:
                raise ExternalUnavailableError(
                    POISKKINO_PROVIDER,
                    message='poiskkino.dev returned invalid JSON',
                ) from error
        except ExternalUnavailableError as error:
            if attempt == POISKKINO_REQUEST_ATTEMPTS or not _is_retryable(error):
                raise
            retry_delay = 2 ** (attempt - 1)
            logger.warning(
                'poiskkino.dev request failed, retrying: attempt=%s/%s delay_seconds=%s status_code=%s',
                attempt,
                POISKKINO_REQUEST_ATTEMPTS,
                retry_delay,
                error.status_code,
            )
            time.sleep(retry_delay)


def _is_retryable(error):
    return (
        error.status_code is None
        or error.status_code in (408, 425, 429)
        or error.status_code >= 500
    )


def _parse_ranked_movie(movie_data):
    if not isinstance(movie_data, dict):
        return None

    position = _positive_int(movie_data.get('top250'))
    if position is None:
        return None

    external_ids = movie_data.get('externalId') or {}
    if not isinstance(external_ids, dict):
        external_ids = {}

    imdb_id = external_ids.get('imdb')
    return PoiskkinoRankedMovie(
        position=position,
        kinopoisk_id=_positive_int(movie_data.get('id')),
        tmdb_id=_positive_int(external_ids.get('tmdb')),
        imdb_id=str(imdb_id).strip() if imdb_id else None,
        name=_clean_text(movie_data.get('name')),
        alternative_name=_clean_text(movie_data.get('alternativeName')),
        year=_positive_int(movie_data.get('year')),
    )


def _positive_int(value):
    try:
        value = int(value)
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None


def _clean_text(value):
    if not isinstance(value, str):
        return None
    value = value.strip()
    return value or None
