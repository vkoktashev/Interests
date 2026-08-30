from rest_framework import mixins, status
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from movies.selectors import get_trending_movies_payload
from movies.services.discovery import TmdbUnavailableError, get_trending_movies
from utils.constants import TMDB_UNAVAILABLE
from utils.swagger import openapi, swagger_auto_schema


class TrendingMoviesViewSet(GenericViewSet, mixins.ListModelMixin):
    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter(
                'time_window',
                openapi.IN_QUERY,
                type=openapi.TYPE_STRING,
                enum=['day', 'week'],
                default='day',
            ),
        ],
        responses={
            200: openapi.Response('OK'),
            503: openapi.Response('TMDB Unavailable'),
        }
    )
    def list(self, request, *args, **kwargs):
        time_window = request.GET.get('time_window', 'day')
        if time_window not in ('day', 'week'):
            time_window = 'day'

        try:
            payload = get_trending_movies(time_window)
        except TmdbUnavailableError:
            return Response(
                {'error': TMDB_UNAVAILABLE},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            get_trending_movies_payload(payload, time_window, request),
            status=status.HTTP_200_OK,
        )
