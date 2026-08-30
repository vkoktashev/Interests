from adrf.viewsets import GenericViewSet
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from general.services.auth import InvalidBearerTokenError, resolve_user_from_bearer
from users.serializers import CurrentUserInfoSerializer


class GeneralViewSet(GenericViewSet):
    serializer_class = CurrentUserInfoSerializer

    @action(
        detail=False,
        methods=['get', 'post'],
        permission_classes=[AllowAny],
        authentication_classes=[],
    )
    def init(self, request):
        try:
            user = request.user if request.user.is_authenticated else resolve_user_from_bearer(
                request.headers.get('Authorization', '')
            )
        except InvalidBearerTokenError:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_401_UNAUTHORIZED)

        result = {}
        if user:
            result['user'] = CurrentUserInfoSerializer(user).data
        return Response(result, status=status.HTTP_200_OK)
