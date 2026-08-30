from django.conf import settings
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from proxy.responses import get_image_http_response
from proxy.services.images import (
    ForbiddenImageHostError,
    ImageUpstreamError,
    ImageUpstreamStatusError,
    InvalidImageUrlError,
    UnsupportedImageTypeError,
    get_image,
)
from users.serializers import UserSerializer


class ProxyViewSet(GenericViewSet):
    serializer_class = UserSerializer

    @action(detail=False, methods=['get'])
    def image(self, request):
        try:
            image_data, cache_status = get_image(request.GET.get('url') or '')
        except InvalidImageUrlError:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        except ForbiddenImageHostError:
            return Response(status=status.HTTP_403_FORBIDDEN)
        except UnsupportedImageTypeError:
            return Response(status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)
        except ImageUpstreamStatusError as error:
            return Response(status=error.status_code)
        except ImageUpstreamError as error:
            if settings.DEBUG:
                return Response(
                    {'error': 'Image proxy upstream request failed', 'details': str(error)},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            return Response(status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return get_image_http_response(image_data, request, cache_status)
