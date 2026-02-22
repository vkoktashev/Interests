import tmdbsimple as tmdb
from django.core.cache import cache
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from requests import HTTPError, ConnectionError, Timeout
from rest_framework import mixins, status
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from proxy.functions import get_proxy_url
from utils.constants import CACHE_TIMEOUT, LANGUAGE, TMDB_BACKDROP_PATH_PREFIX, TMDB_POSTER_PATH_PREFIX, \
    TMDB_UNAVAILABLE


def get_trending_movies_results(time_window='day'):
    key = f'tmdb_trending_movies_{time_window}_{LANGUAGE}'
    results = cache.get(key, None)
    if results is None:
        results = tmdb.Trending(media_type='movie', time_window=time_window).info(language=LANGUAGE)
        cache.set(key, results, min(CACHE_TIMEOUT, 60 * 30))
    return results


class TrendingMoviesViewSet(GenericViewSet, mixins.ListModelMixin):
    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('time_window', openapi.IN_QUERY, type=openapi.TYPE_STRING,
                              enum=['day', 'week'], default='day'),
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
            response = get_trending_movies_results(time_window)
        except (HTTPError, ConnectionError, Timeout):
            return Response({'error': TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        results = []
        for item in response.get('results', [])[:10]:
            results.append({
                'id': item.get('id'),
                'name': item.get('title') or item.get('name') or '',
                'original_name': item.get('original_title') or item.get('original_name') or '',
                'poster_path': get_proxy_url(request.scheme, TMDB_POSTER_PATH_PREFIX, item.get('poster_path')),
                'backdrop_path': get_proxy_url(request.scheme, TMDB_BACKDROP_PATH_PREFIX, item.get('backdrop_path')),
                'release_date': item.get('release_date'),
                'vote_average': item.get('vote_average'),
                'vote_count': item.get('vote_count'),
                'overview': item.get('overview') or '',
            })

        return Response({
            'time_window': time_window,
            'results': results,
        }, status=status.HTTP_200_OK)
