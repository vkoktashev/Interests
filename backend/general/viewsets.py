from adrf.viewsets import GenericViewSet
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import UntypedToken

from users.serializers import UserInfoSerializer


class InvalidBearerTokenError(Exception):
    pass


class GeneralViewSet(GenericViewSet):
    serializer_class = UserInfoSerializer

    @staticmethod
    def _resolve_user_from_bearer(request):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ', 1)[1].strip()
        if not token:
            return None

        try:
            payload = UntypedToken(token)
        except TokenError:
            raise InvalidBearerTokenError

        user_id = payload.get('user_id')
        if not user_id:
            raise InvalidBearerTokenError

        user = get_user_model().objects.filter(id=user_id).first()
        if not user:
            raise InvalidBearerTokenError

        return user

    @action(
        detail=False,
        methods=['get', 'post'],
        permission_classes=[AllowAny],
        authentication_classes=[],
    )
    def init(self, request):
        result = {}
        try:
            user = request.user if request.user.is_authenticated else self._resolve_user_from_bearer(request)
        except InvalidBearerTokenError:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_401_UNAUTHORIZED)

        if user:
            result["user"] = UserInfoSerializer(user).data
        return Response(result, status=status.HTTP_200_OK)
