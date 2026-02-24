import logging

import requests
from django.conf import settings
from django.http import HttpResponse
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
    ALLOWED_IMAGE_HOSTS = {
        'image.tmdb.org',
        'media.rawg.io',
    }

    @action(detail=False, methods=['get'])
    def image(self, request):
        url = request.GET.get('url') or ''
        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https') or not parsed.netloc:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        if parsed.hostname not in self.ALLOWED_IMAGE_HOSTS:
            return Response(status=status.HTTP_403_FORBIDDEN)

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

            response = HttpResponse(res.content, content_type=content_type)
            cache_control = res.headers.get('Cache-Control')
            if cache_control:
                response['Cache-Control'] = cache_control
            return response

        return Response(status=res.status_code)
