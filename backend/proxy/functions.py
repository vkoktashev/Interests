from urllib.parse import quote


def _get_absolute_proxy_prefix(request_or_scheme):
    if hasattr(request_or_scheme, 'get_host'):
        return f"{request_or_scheme.scheme}://{request_or_scheme.get_host()}"
    return ''


def get_proxy_url(request_or_scheme, path_prefix_or_url, path=None):
    if path is None:
        url = path_prefix_or_url or ''
    else:
        url = '' if path is None else f"{path_prefix_or_url}{path or ''}"

    if not url:
        return ''

    encoded_url = quote(url, safe='')
    absolute_prefix = _get_absolute_proxy_prefix(request_or_scheme)
    return f"{absolute_prefix}/proxy/image/?url={encoded_url}"
