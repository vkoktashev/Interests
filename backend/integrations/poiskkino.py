from dataclasses import dataclass
import os

from integrations.exceptions import ExternalUnavailableError
from integrations.http import external_request


POISKKINO_PROVIDER = 'poiskkino.dev'
POISKKINO_MOVIES_URL = 'https://api.poiskkino.dev/v1.5/movie'
POISKKINO_PAGE_SIZE = 10
POISKKINO_MAX_PAGES = 30


@dataclass(frozen=True)
class PoiskkinoRankedMovie:
    position: int
    kinopoisk_id: int | None
    tmdb_id: int | None
    imdb_id: str | None


def get_kinopoisk_top250():
    api_key = os.environ.get('POISKKINO_API_KEY')
    if not api_key:
        raise ExternalUnavailableError(
            POISKKINO_PROVIDER,
            message='POISKKINO_API_KEY is not configured',
        )

    ranked_movies = {}
    cursor = None
    seen_cursors = set()
    for _ in range(POISKKINO_MAX_PAGES):
        params = [
            ('limit', POISKKINO_PAGE_SIZE),
            ('notNullFields', 'top250'),
            ('sortField', 'top250'),
            ('sortType', '1'),
            ('selectFields', 'id'),
            ('selectFields', 'externalId'),
            ('selectFields', 'top250'),
        ]
        if cursor is not None:
            params.append(('next', cursor))

        response = external_request(
            POISKKINO_PROVIDER,
            'GET',
            POISKKINO_MOVIES_URL,
            headers={'X-API-KEY': api_key},
            params=params,
        )
        try:
            payload = response.json()
        except ValueError as error:
            raise ExternalUnavailableError(
                POISKKINO_PROVIDER,
                message='poiskkino.dev returned invalid JSON',
            ) from error

        docs = payload.get('docs') if isinstance(payload, dict) else None
        if not isinstance(docs, list):
            raise ExternalUnavailableError(
                POISKKINO_PROVIDER,
                message='poiskkino.dev returned an unexpected response',
            )

        for movie_data in docs:
            ranked_movie = _parse_ranked_movie(movie_data)
            if ranked_movie is not None:
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
    else:
        raise ExternalUnavailableError(
            POISKKINO_PROVIDER,
            message='poiskkino.dev pagination exceeded the safety limit',
        )

    return [ranked_movies[position] for position in sorted(ranked_movies)]


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
    )


def _positive_int(value):
    try:
        value = int(value)
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None
