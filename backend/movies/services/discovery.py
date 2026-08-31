import tmdbsimple as tmdb

from integrations.tmdb import TmdbIntegrationError as TmdbUnavailableError, cached_tmdb_call
from utils.constants import LANGUAGE


TRENDING_CACHE_TTL_SECONDS = 60 * 60 * 12


def search_tmdb_movies(query, page):
    key = f'tmdb_movie_search_{query.replace(" ", "_")}_page_{page}'
    return cached_tmdb_call(
        key,
        lambda: tmdb.Search().movie(query=query, page=page, language=LANGUAGE),
    )


def get_trending_movies(time_window):
    key = f'tmdb_trending_movies_{time_window}_{LANGUAGE}'
    return cached_tmdb_call(
        key,
        lambda: tmdb.Trending(
            media_type='movie',
            time_window=time_window,
        ).info(language=LANGUAGE),
        timeout=TRENDING_CACHE_TTL_SECONDS,
    )
