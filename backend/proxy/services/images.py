import hashlib
import logging
from time import time
from urllib.parse import urlparse

import requests
from django.core.cache import cache
from requests.exceptions import InvalidSchema, MissingSchema, RequestException


logger = logging.getLogger(__name__)

IMAGE_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7
ALLOWED_IMAGE_HOSTS = {
    'image.tmdb.org',
    'media.rawg.io',
}


class InvalidImageUrlError(Exception):
    pass


class ForbiddenImageHostError(Exception):
    pass


class UnsupportedImageTypeError(Exception):
    pass


class ImageUpstreamError(Exception):
    pass


class ImageUpstreamStatusError(Exception):
    def __init__(self, status_code):
        self.status_code = status_code
        super().__init__(status_code)


def get_image(url):
    _validate_image_url(url)
    cache_key = _get_cache_key(url)
    cached_image = cache.get(cache_key)
    if cached_image:
        return cached_image, 'HIT'

    try:
        response = requests.get(
            url,
            timeout=(5, 20),
            headers={
                'User-Agent': 'InterestsImageProxy/1.0',
                'Accept': 'image/*,*/*;q=0.8',
                'Referer': 'https://www.themoviedb.org/',
            },
            allow_redirects=True,
        )
    except (MissingSchema, InvalidSchema) as error:
        raise InvalidImageUrlError from error
    except RequestException as error:
        logger.warning('Image proxy request failed: %s (%s)', url, repr(error))
        raise ImageUpstreamError(str(error)) from error

    if response.status_code != 200:
        raise ImageUpstreamStatusError(response.status_code)

    content_type = response.headers.get('Content-Type', 'image/jpeg')
    if not content_type.startswith('image/'):
        raise UnsupportedImageTypeError

    content = response.content
    image_data = {
        'content': content,
        'content_type': content_type,
        'etag': f'"{hashlib.sha256(content).hexdigest()}"',
        'last_modified_ts': int(time()),
    }
    cache.set(cache_key, image_data, IMAGE_CACHE_TTL_SECONDS)
    return image_data, 'MISS'


def _validate_image_url(url):
    parsed = urlparse(url)
    if parsed.scheme not in ('http', 'https') or not parsed.netloc:
        raise InvalidImageUrlError
    if parsed.hostname not in ALLOWED_IMAGE_HOSTS:
        raise ForbiddenImageHostError


def _get_cache_key(url):
    return f'proxy_image:{hashlib.sha256(url.encode("utf-8")).hexdigest()}'
