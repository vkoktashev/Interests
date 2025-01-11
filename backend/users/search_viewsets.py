from django.contrib.postgres.search import TrigramSimilarity
from rest_framework import mixins, status
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from users.models import User
from users.serializers import UserSerializer


class SearchUsersViewSet(GenericViewSet, mixins.ListModelMixin):
    serializer_class = UserSerializer

    def list(self, request, *args, **kwargs):
        query = request.GET.get('query', '')
        results = User.objects.annotate(similarity=TrigramSimilarity('username', query)) \
            .filter(similarity__gt=0.1) \
            .order_by('-similarity')
        serializer = UserSerializer(results, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
