from datetime import timedelta

from django.core.cache import cache

from games.tasks import refresh_game_details

GAME_DETAILS_REFRESH_INTERVAL = timedelta(days=1)
GAME_DETAILS_REFRESH_ENQUEUE_DEBOUNCE_SECS = 60 * 30
GAME_DETAILS_REFRESH_BROKER_BACKOFF_SECS = 60


def enqueue_game_refresh(slug):
    lock_key = f'game_details_refresh_enqueued_{slug}'
    broker_backoff_key = 'game_details_refresh_broker_unavailable'

    if cache.get(broker_backoff_key):
        return
    if not cache.add(lock_key, True, GAME_DETAILS_REFRESH_ENQUEUE_DEBOUNCE_SECS):
        return

    try:
        refresh_game_details.delay(slug)
    except Exception:
        cache.set(broker_backoff_key, True, GAME_DETAILS_REFRESH_BROKER_BACKOFF_SECS)
