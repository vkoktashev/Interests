from multipledispatch import dispatch

from utils.constants import SITE_URL


@dispatch(str, str, str)
def get_proxy_url(scheme, path_prefix, path):
    url = path_prefix + path \
        if path is not None \
        else ''

    return get_proxy_url(scheme, url)


@dispatch(str, str)
def get_proxy_url(scheme, url):
    if len(url) > 0:
        url = f"{scheme}://{SITE_URL}/api/proxy/image?url={url}"

    return url
