from django.core.cache import cache


CACHE_MISS = object()


def cached_external_call(cache_key, fetch, timeout, cache_none=False):
    cached_value = cache.get(cache_key, CACHE_MISS)
    if cached_value is not CACHE_MISS:
        return cached_value

    value = fetch()
    if value is not None or cache_none:
        cache.set(cache_key, value, timeout)
    return value
