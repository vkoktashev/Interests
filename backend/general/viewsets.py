from adrf.viewsets import GenericViewSet
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from users.serializers import UserInfoSerializer


class GeneralViewSet(GenericViewSet):
    serializer_class = UserInfoSerializer

    @action(detail=False, methods=['get', 'post'], permission_classes=[AllowAny])
    def init(self, request):
        result = {"user": None}
        if request.user.is_authenticated:
            result["user"] = UserInfoSerializer(request.user).data
        return Response(result, status=status.HTTP_200_OK)
