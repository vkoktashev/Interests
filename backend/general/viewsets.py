from rest_framework import status, mixins
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from users.serializers import UserInfoSerializer


class GeneralViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def init(self, request):
        result = {"user": None}
        if request.user.is_authenticated:
            serializer = UserInfoSerializer(request.user)
            result = serializer.data
        return Response(result, status=status.HTTP_200_OK)
