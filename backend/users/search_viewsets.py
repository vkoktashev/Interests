from rest_framework import mixins, status
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from users.selectors import search_users
from users.serializers import UserSerializer


class SearchUsersViewSet(GenericViewSet, mixins.ListModelMixin):
    serializer_class = UserSerializer

    def list(self, request, *args, **kwargs):
        return Response(
            search_users(request.GET.get('query', '')),
            status=status.HTTP_200_OK,
        )
