from datetime import timedelta
import logging

from django.core.cache import cache

from games.tasks import refresh_game_details, refresh_game_details_by_igdb_id

GAME_DETAILS_REFRESH_INTERVAL = timedelta(days=1)
GAME_DETAILS_REFRESH_ENQUEUE_DEBOUNCE_SECS = 60 * 30
GAME_DETAILS_REFRESH_BROKER_BACKOFF_SECS = 60

logger = logging.getLogger(__name__)


def enqueue_game_refresh(slug=None, igdb_id=None, refresh_version=None):
    identity = f'igdb:{igdb_id}' if igdb_id is not None else f'slug:{slug}'
    refresh_version_key = refresh_version if refresh_version is not None else 'unknown'

    lock_key = f'game_details_refresh_enqueued_{identity}_{refresh_version_key}'
    broker_backoff_key = 'game_details_refresh_broker_unavailable'

    if cache.get(broker_backoff_key):
        logger.info(
            'enqueue_game_refresh skipped due broker backoff: identity=%s key=%s',
            identity,
            broker_backoff_key,
        )
        return
    if not cache.add(lock_key, True, GAME_DETAILS_REFRESH_ENQUEUE_DEBOUNCE_SECS):
        logger.info('enqueue_game_refresh debounce skip: lock_key=%s', lock_key)
        return

    try:
        if igdb_id is not None:
            refresh_game_details_by_igdb_id.delay(igdb_id)
            logger.info('enqueue_game_refresh queued by igdb_id=%s', igdb_id)
        else:
            refresh_game_details.delay(slug)
            logger.info('enqueue_game_refresh queued by slug=%s', slug)
    except Exception:
        cache.set(broker_backoff_key, True, GAME_DETAILS_REFRESH_BROKER_BACKOFF_SECS)
        logger.exception('enqueue_game_refresh failed to dispatch: identity=%s', identity)
