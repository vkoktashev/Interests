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

from proxy.functions import get_proxy_url
from shows.models import Show, UserShow
from shows.serializers import ShowSerializer
from utils.constants import DEFAULT_PAGE_NUMBER, TMDB_BACKDROP_PATH_PREFIX, TMDB_POSTER_PATH_PREFIX, \
    DEFAULT_PAGE_SIZE, LANGUAGE, CACHE_TIMEOUT
from utils.functions import get_page_size


def _attach_shows_user_status(request, results):
    for result in results:
        result['user_status'] = None

    if not results or not request.user.is_authenticated:
        return

    tmdb_ids = [result.get('id', result.get('tmdb_id')) for result in results]
    user_shows = UserShow.objects.filter(user=request.user, show__tmdb_id__in=tmdb_ids) \
        .values('show__tmdb_id', 'status')
    user_status_by_tmdb_id = {row['show__tmdb_id']: row['status'] for row in user_shows}

    for result in results:
        tmdb_id = result.get('id', result.get('tmdb_id'))
        result['user_status'] = user_status_by_tmdb_id.get(tmdb_id)


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
        query = request.GET.get('query', '')
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)
        try:
            results = get_show_search_results(query, page)
        except HTTPError:
            results = None

        for result in results['results']:
            result['backdrop_path'] = get_proxy_url(request,
                                                    TMDB_BACKDROP_PATH_PREFIX,
                                                    result.get('backdrop_path'))
            result['poster_path'] = get_proxy_url(request,
                                                  TMDB_POSTER_PATH_PREFIX,
                                                  result.get('poster_path'))
        _attach_shows_user_status(request, results['results'])

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

        shows = Show.objects \
            .annotate(similarity=Greatest(TrigramSimilarity('tmdb_name', query),
                                          TrigramSimilarity('tmdb_original_name', query))) \
            .filter(
                Q(tmdb_name__icontains=query) |
                Q(tmdb_original_name__icontains=query) |
                Q(similarity__gt=0.1)
            ) \
            .order_by('-similarity', 'tmdb_name')
        paginator_page = Paginator(shows, page_size).get_page(page)
        serializer = ShowSerializer(paginator_page.object_list, many=True)
        results = serializer.data
        _attach_shows_user_status(request, results)

        return Response(results)


def get_show_search_results(query, page):
    key = f'tmdb_show_search_{query.replace(" ", "_")}_page_{page}'
    results = cache.get(key, None)
    if results is None:
        results = tmdb.Search().tv(query=query, page=page, language=LANGUAGE)
        cache.set(key, results, CACHE_TIMEOUT)
    return results
