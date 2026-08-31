import os

import tmdbsimple as tmdb
from requests import RequestException

from integrations.cache import cached_external_call
from integrations.exceptions import (
    ExternalIntegrationError,
    ExternalNotFoundError,
    ExternalUnavailableError,
    get_error_status_code,
)
TMDB_PROVIDER = 'tmdb'
TMDB_CACHE_TTL_SECONDS = 60 * 60 * 10
TMDB_REQUEST_TIMEOUT_SECONDS = 8

tmdb.REQUESTS_TIMEOUT = TMDB_REQUEST_TIMEOUT_SECONDS


class TmdbIntegrationError(ExternalIntegrationError):
    pass


class TmdbNotFoundError(ExternalNotFoundError, TmdbIntegrationError):
    pass


class TmdbUnavailableError(ExternalUnavailableError, TmdbIntegrationError):
    pass


def call_tmdb(fetch):
    _configure_tmdb()
    try:
        return fetch()
    except TmdbIntegrationError:
        raise
    except (RequestException, ValueError) as error:
        status_code = get_error_status_code(error)
        if status_code == 404:
            raise TmdbNotFoundError(TMDB_PROVIDER, status_code=status_code) from error
        raise TmdbUnavailableError(TMDB_PROVIDER, status_code=status_code) from error


def _configure_tmdb():
    api_key = os.environ.get('TMDB_API_KEY')
    if not api_key:
        raise TmdbUnavailableError(TMDB_PROVIDER, message='TMDB_API_KEY is not configured')
    tmdb.API_KEY = api_key


def cached_tmdb_call(cache_key, fetch, timeout=TMDB_CACHE_TTL_SECONDS, cache_none=False):
    return cached_external_call(
        cache_key,
        lambda: call_tmdb(fetch),
        timeout,
        cache_none=cache_none,
    )
