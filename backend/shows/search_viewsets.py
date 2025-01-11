import tmdbsimple as tmdb
from django.contrib.postgres.search import TrigramSimilarity
from django.core.cache import cache
from django.core.paginator import Paginator
from django.db.models.functions import Greatest
from requests import HTTPError
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from proxy.functions import get_proxy_url
from shows.models import Show
from shows.serializers import ShowSerializer
from utils.constants import DEFAULT_PAGE_NUMBER, TMDB_BACKDROP_PATH_PREFIX, DEFAULT_PAGE_SIZE, LANGUAGE, CACHE_TIMEOUT
from utils.functions import get_page_size


class SearchShowsViewSet(GenericViewSet, mixins.ListModelMixin):
    serializer_class = ShowSerializer

    @action(detail=False, methods=['get'])
    def tmdb(self, request, *args, **kwargs):
        query = request.GET.get('query', '')
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)
        try:
            results = get_show_search_results(query, page)
        except HTTPError:
            results = None

        for result in results['results']:
            result['backdrop_path'] = get_proxy_url(request.scheme,
                                                    TMDB_BACKDROP_PATH_PREFIX,
                                                    result.get('backdrop_path'))
            result['poster_path'] = get_proxy_url(request.scheme,
                                                  TMDB_BACKDROP_PATH_PREFIX,
                                                  result.get('poster_path'))

        return Response(results, status=status.HTTP_200_OK)

    def list(self, request, *args, **kwargs):
        query = request.GET.get('query', '')
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)
        page_size = get_page_size(request.GET.get('page_size', DEFAULT_PAGE_SIZE))

        shows = Show.objects \
            .annotate(similarity=Greatest(TrigramSimilarity('tmdb_name', query),
                                          TrigramSimilarity('tmdb_original_name', query))) \
            .filter(similarity__gt=0.1) \
            .order_by('-similarity')
        paginator_page = Paginator(shows, page_size).get_page(page)
        serializer = ShowSerializer(paginator_page.object_list, many=True)

        return Response(serializer.data)


def get_show_search_results(query, page):
    key = f'tmdb_show_search_{query.replace(" ", "_")}_page_{page}'
    results = cache.get(key, None)
    if results is None:
        results = tmdb.Search().tv(query=query, page=page, language=LANGUAGE)
        cache.set(key, results, CACHE_TIMEOUT)
    return results
