from adrf.viewsets import GenericViewSet
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import UntypedToken

from users.serializers import UserInfoSerializer


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
            user_id = payload.get('user_id')
            if not user_id:
                return None
            return get_user_model().objects.filter(id=user_id).first()
        except Exception:
            return None

    @action(
        detail=False,
        methods=['get', 'post'],
        permission_classes=[AllowAny],
        authentication_classes=[],
    )
    def init(self, request):
        result = {}
        user = request.user if request.user.is_authenticated else self._resolve_user_from_bearer(request)
        if user:
            result["user"] = UserInfoSerializer(user).data
        return Response(result, status=status.HTTP_200_OK)
