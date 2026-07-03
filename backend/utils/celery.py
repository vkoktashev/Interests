import logging
import socket
from urllib.parse import urlparse

from django.conf import settings
from django.core.cache import cache

BROKER_BACKOFF_SECS = 60
BROKER_AVAILABLE_CACHE_SECS = 5
BROKER_CONNECT_TIMEOUT_SECS = 0.2
BROKER_AVAILABLE_CACHE_KEY = 'celery_broker_available'
BROKER_UNAVAILABLE_CACHE_KEY = 'celery_broker_unavailable'

logger = logging.getLogger(__name__)


def enqueue_background_task(task, args=None, kwargs=None, task_name=None):
    if cache.get(BROKER_UNAVAILABLE_CACHE_KEY):
        return False

    if not cache.get(BROKER_AVAILABLE_CACHE_KEY) and not _is_broker_reachable():
        cache.set(BROKER_UNAVAILABLE_CACHE_KEY, True, BROKER_BACKOFF_SECS)
        logger.warning('Celery broker is unavailable, skipped task enqueue: %s', task_name or task.name)
        return False

    try:
        task.apply_async(
            args=args or (),
            kwargs=kwargs or {},
            ignore_result=True,
            retry=False
        )
    except Exception:
        cache.set(BROKER_UNAVAILABLE_CACHE_KEY, True, BROKER_BACKOFF_SECS)
        logger.exception('Failed to enqueue Celery task: %s', task_name or task.name)
        return False

    return True


def _is_broker_reachable():
    endpoint = _get_broker_endpoint()
    if endpoint is None:
        return True

    host, port = endpoint
    try:
        with socket.create_connection((host, port), timeout=BROKER_CONNECT_TIMEOUT_SECS):
            cache.set(BROKER_AVAILABLE_CACHE_KEY, True, BROKER_AVAILABLE_CACHE_SECS)
            return True
    except OSError:
        return False


def _get_broker_endpoint():
    broker_url = getattr(settings, 'CELERY_BROKER_URL', '')
    parsed_url = urlparse(broker_url)

    if parsed_url.scheme not in ('redis', 'rediss'):
        return None

    host = parsed_url.hostname
    if not host:
        return None

    return host, parsed_url.port or 6379
