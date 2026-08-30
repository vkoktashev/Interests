from rest_framework import mixins, status
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from movies.selectors import get_top_rated_movies_payload
from utils.swagger import openapi, swagger_auto_schema


class TopRatedMoviesViewSet(GenericViewSet, mixins.ListModelMixin):
    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('limit', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, default=10),
        ],
        responses={200: openapi.Response('OK')}
    )
    def list(self, request, *args, **kwargs):
        payload = get_top_rated_movies_payload(
            request.user,
            request,
            request.GET.get('limit'),
            request.GET.get('page', 1),
            request.GET.get('page_size', 50),
        )
        return Response(payload, status=status.HTTP_200_OK)
