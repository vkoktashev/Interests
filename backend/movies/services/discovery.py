import tmdbsimple as tmdb
from django.core.cache import cache
from requests import ConnectionError, HTTPError, Timeout

from utils.constants import CACHE_TIMEOUT, LANGUAGE


TRENDING_CACHE_TTL_SECONDS = 60 * 60 * 12


class TmdbUnavailableError(Exception):
    pass


def search_tmdb_movies(query, page):
    key = f'tmdb_movie_search_{query.replace(" ", "_")}_page_{page}'
    results = cache.get(key, None)
    if results is not None:
        return results

    try:
        results = tmdb.Search().movie(query=query, page=page, language=LANGUAGE)
    except (HTTPError, ConnectionError, Timeout) as error:
        raise TmdbUnavailableError from error
    cache.set(key, results, CACHE_TIMEOUT)
    return results


def get_trending_movies(time_window):
    key = f'tmdb_trending_movies_{time_window}_{LANGUAGE}'
    results = cache.get(key, None)
    if results is not None:
        return results

    try:
        results = tmdb.Trending(
            media_type='movie',
            time_window=time_window,
        ).info(language=LANGUAGE)
    except (HTTPError, ConnectionError, Timeout) as error:
        raise TmdbUnavailableError from error
    cache.set(key, results, TRENDING_CACHE_TTL_SECONDS)
    return results
