from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from shows.selectors import (
    get_database_show_search_results,
    get_tmdb_show_search_payload,
)
from shows.serializers import ShowSerializer
from shows.services.discovery import TmdbUnavailableError, search_tmdb_shows
from utils.constants import DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE, TMDB_UNAVAILABLE
from utils.functions import get_page_size
from utils.swagger import openapi, swagger_auto_schema


class SearchShowsViewSet(GenericViewSet, mixins.ListModelMixin):
    serializer_class = ShowSerializer

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('query', openapi.IN_QUERY, type=openapi.TYPE_STRING),
            openapi.Parameter('page', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, default=DEFAULT_PAGE_NUMBER),
        ],
        responses={
            200: openapi.Response('OK'),
            503: openapi.Response('TMDB Unavailable'),
        }
    )
    @action(detail=False, methods=['get'])
    def tmdb(self, request, *args, **kwargs):
        try:
            payload = search_tmdb_shows(
                request.GET.get('query', ''),
                request.GET.get('page', DEFAULT_PAGE_NUMBER),
            )
        except TmdbUnavailableError:
            return Response(
                {'error': TMDB_UNAVAILABLE},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            get_tmdb_show_search_payload(payload, request.user, request),
            status=status.HTTP_200_OK,
        )

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('query', openapi.IN_QUERY, type=openapi.TYPE_STRING),
            openapi.Parameter('page', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, default=DEFAULT_PAGE_NUMBER),
            openapi.Parameter('page_size', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, default=DEFAULT_PAGE_SIZE),
        ],
        responses={200: openapi.Response('OK')}
    )
    def list(self, request, *args, **kwargs):
        results = get_database_show_search_results(
            request.user,
            request.GET.get('query', '').strip(),
            request.GET.get('page', DEFAULT_PAGE_NUMBER),
            get_page_size(request.GET.get('page_size', DEFAULT_PAGE_SIZE)),
        )
        return Response(results)
