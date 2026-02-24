import os
from urllib.parse import quote


def _get_absolute_proxy_prefix(request_or_scheme):
    if hasattr(request_or_scheme, 'get_host'):
        return f"{request_or_scheme.scheme}://{request_or_scheme.get_host()}"
    return ''


def _get_proxy_public_path_prefix(request_or_scheme):
    # Allow explicit override for production/nginx setups.
    configured_prefix = os.getenv('PROXY_PUBLIC_PATH_PREFIX')
    if configured_prefix:
        return configured_prefix.rstrip('/')

    # Local dev usually hits backend directly, without /api prefix.
    if hasattr(request_or_scheme, 'get_host'):
        host = (request_or_scheme.get_host() or '').split(':')[0].lower()
        if host in ('localhost', '127.0.0.1'):
            return '/proxy'

    # Production frontend usually exposes backend under /api/*.
    return '/api/proxy'


def get_proxy_url(request_or_scheme, path_prefix_or_url, path=None):
    if path is None:
        url = path_prefix_or_url or ''
    else:
        url = '' if path is None else f"{path_prefix_or_url}{path or ''}"

    if not url:
        return ''

    encoded_url = quote(url, safe='')
    absolute_prefix = _get_absolute_proxy_prefix(request_or_scheme)
    proxy_path_prefix = _get_proxy_public_path_prefix(request_or_scheme)
    return f"{absolute_prefix}{proxy_path_prefix}/image/?url={encoded_url}"
