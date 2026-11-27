import tmdbsimple as tmdb

from integrations.tmdb import TmdbIntegrationError as TmdbUnavailableError, cached_tmdb_call
from utils.constants import LANGUAGE


TRENDING_CACHE_TTL_SECONDS = 60 * 60 * 12


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
