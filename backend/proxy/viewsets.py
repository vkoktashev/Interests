import logging
import hashlib
from time import time

import requests
from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponse
from django.utils.http import http_date, parse_http_date_safe
from requests.exceptions import MissingSchema, InvalidSchema, RequestException
from urllib.parse import urlparse
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from users.serializers import UserSerializer

logger = logging.getLogger(__name__)


class ProxyViewSet(GenericViewSet):
    serializer_class = UserSerializer
    IMAGE_CACHE_TTL_SECS = 60 * 60 * 24 * 7
    IMAGE_CLIENT_MAX_AGE_SECS = 60 * 60 * 24 * 365
    ALLOWED_IMAGE_HOSTS = {
        'image.tmdb.org',
        'media.rawg.io',
    }

    @staticmethod
    def _cache_key(url: str) -> str:
        return f'proxy_image:{hashlib.sha256(url.encode("utf-8")).hexdigest()}'

    @staticmethod
    def _to_http_response(image_data: dict, request, cache_status: str = ''):
        if_none_match = request.headers.get('If-None-Match')
        if_modified_since = request.headers.get('If-Modified-Since')
        etag = image_data.get('etag')
        last_modified_ts = image_data.get('last_modified_ts') or int(time())
        last_modified = http_date(last_modified_ts)

        if if_none_match and if_none_match == etag:
            response = HttpResponse(status=status.HTTP_304_NOT_MODIFIED)
        elif if_modified_since:
            since_ts = parse_http_date_safe(if_modified_since)
            if since_ts is not None and since_ts >= last_modified_ts:
                response = HttpResponse(status=status.HTTP_304_NOT_MODIFIED)
            else:
                response = HttpResponse(
                    image_data.get('content', b''),
                    content_type=image_data.get('content_type', 'image/jpeg'),
                )
        else:
            response = HttpResponse(
                image_data.get('content', b''),
                content_type=image_data.get('content_type', 'image/jpeg'),
            )

        response['Cache-Control'] = (
            f'public, max-age={ProxyViewSet.IMAGE_CLIENT_MAX_AGE_SECS}, immutable'
        )
        response['ETag'] = etag
        response['Last-Modified'] = last_modified
        if cache_status:
            response['X-Proxy-Cache'] = cache_status
        return response

    @action(detail=False, methods=['get'])
    def image(self, request):
        url = request.GET.get('url') or ''
        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https') or not parsed.netloc:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        if parsed.hostname not in self.ALLOWED_IMAGE_HOSTS:
            return Response(status=status.HTTP_403_FORBIDDEN)

        cache_key = self._cache_key(url)
        cached_image = cache.get(cache_key)
        if cached_image:
            return self._to_http_response(cached_image, request, cache_status='HIT')

        try:
            res = requests.get(
                url,
                timeout=(5, 20),
                headers={
                    'User-Agent': 'InterestsImageProxy/1.0',
                    'Accept': 'image/*,*/*;q=0.8',
                    'Referer': 'https://www.themoviedb.org/',
                },
                allow_redirects=True,
            )
        except (MissingSchema, InvalidSchema):
            return Response(status=status.HTTP_400_BAD_REQUEST)
        except RequestException as e:
            logger.warning('Image proxy request failed: %s (%s)', url, repr(e))
            if settings.DEBUG:
                return Response(
                    {'error': 'Image proxy upstream request failed', 'details': str(e)},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)

        if res.status_code == 200:
            content_type = res.headers.get('Content-Type', 'image/jpeg')
            if not content_type.startswith('image/'):
                return Response(status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)

            content = res.content
            etag = f'"{hashlib.sha256(content).hexdigest()}"'
            image_data = {
                'content': content,
                'content_type': content_type,
                'etag': etag,
                'last_modified_ts': int(time()),
            }
            cache.set(cache_key, image_data, self.IMAGE_CACHE_TTL_SECS)
            return self._to_http_response(image_data, request, cache_status='MISS')

        return Response(status=res.status_code)
