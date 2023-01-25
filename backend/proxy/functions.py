from utils.constants import SITE_URL


def get_proxy_url(scheme, path_prefix, path):
    url = path_prefix + path \
        if path is not None \
        else ''

    if len(url) > 0:
        url = f"{scheme}://{SITE_URL}/api/proxy/proxy/image?url={url}"

    return url
