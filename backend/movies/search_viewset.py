import tmdbsimple as tmdb
from django.contrib.postgres.search import TrigramSimilarity
from django.core.cache import cache
from django.core.paginator import Paginator
from django.db.models import Q
from django.db.models.functions import Greatest
from utils.swagger import openapi, swagger_auto_schema
from requests import HTTPError
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from movies.models import Movie
from movies.serializers import MovieSerializer
from proxy.functions import get_proxy_url
from utils.constants import LANGUAGE, CACHE_TIMEOUT, \
    TMDB_BACKDROP_PATH_PREFIX, TMDB_POSTER_PATH_PREFIX, DEFAULT_PAGE_SIZE
from utils.functions import get_page_size
from utils.openapi_params import DEFAULT_PAGE_NUMBER


class SearchMoviesViewSet(GenericViewSet, mixins.ListModelMixin):
    serializer_class = MovieSerializer

    @swagger_auto_schema(
        operation_description="Search for movies using the TMDB API.",
        manual_parameters=[
            openapi.Parameter('query', openapi.IN_QUERY, type=openapi.TYPE_STRING),
            openapi.Parameter('page', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, default=DEFAULT_PAGE_NUMBER),
        ],
        responses={
            200: openapi.Response('OK'),
        }
    )
    @action(detail=False, methods=['get'])
    def tmdb(self, request, *args, **kwargs):
        query = request.GET.get('query', '')
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)
        try:
            results = get_movie_search_results(query=query, page=page)
        except HTTPError:
            results = None

        for result in results['results']:
            result['backdrop_path'] = get_proxy_url(request,
                                                    TMDB_BACKDROP_PATH_PREFIX,
                                                    result.get('backdrop_path'))
            result['poster_path'] = get_proxy_url(request,
                                                  TMDB_POSTER_PATH_PREFIX,
                                                  result.get('poster_path'))

        return Response(results, status=status.HTTP_200_OK)

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('query', openapi.IN_QUERY, type=openapi.TYPE_STRING),
            openapi.Parameter('page', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, default=DEFAULT_PAGE_NUMBER),
            openapi.Parameter('page_size', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, default=DEFAULT_PAGE_SIZE),
        ],
        responses={
            200: openapi.Response('OK'),
        }
    )
    def list(self, request, *args, **kwargs):
        query = request.GET.get('query', '').strip()
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)
        page_size = get_page_size(request.GET.get('page_size', DEFAULT_PAGE_SIZE))

        if not query:
            return Response([])

        movies = Movie.objects \
            .annotate(similarity=Greatest(TrigramSimilarity('tmdb_name', query),
                                          TrigramSimilarity('tmdb_original_name', query))) \
            .filter(
                Q(tmdb_name__icontains=query) |
                Q(tmdb_original_name__icontains=query) |
                Q(similarity__gt=0.1)
            ) \
            .order_by('-similarity', 'tmdb_name')
        paginator_page = Paginator(movies, page_size).get_page(page)
        serializer = MovieSerializer(paginator_page.object_list, many=True)

        return Response(serializer.data)


def get_movie_search_results(query, page):
    key = f'tmdb_movie_search_{query.replace(" ", "_")}_page_{page}'
    results = cache.get(key, None)
    if results is None:
        results = tmdb.Search().movie(query=query, page=page, language=LANGUAGE)
        cache.set(key, results, CACHE_TIMEOUT)
    return results
