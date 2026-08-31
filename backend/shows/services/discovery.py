import tmdbsimple as tmdb

from integrations.tmdb import TmdbIntegrationError as TmdbUnavailableError, cached_tmdb_call
from utils.constants import LANGUAGE


TRENDING_CACHE_TTL_SECONDS = 60 * 60 * 12


def search_tmdb_shows(query, page):
    key = f'tmdb_show_search_{query.replace(" ", "_")}_page_{page}'
    return cached_tmdb_call(
        key,
        lambda: tmdb.Search().tv(query=query, page=page, language=LANGUAGE),
    )


def get_trending_shows(time_window):
    key = f'tmdb_trending_shows_{time_window}_{LANGUAGE}'
    return cached_tmdb_call(
        key,
        lambda: tmdb.Trending(
            media_type='tv',
            time_window=time_window,
        ).info(language=LANGUAGE),
        timeout=TRENDING_CACHE_TTL_SECONDS,
    )
