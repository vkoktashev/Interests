from django.core.paginator import Paginator
from django.db.models import Count, Avg, Sum, Value, IntegerField
from django.db.models.functions import Coalesce
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, status
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from proxy.functions import get_proxy_url
from movies.models import UserMovie


class TopRatedMoviesViewSet(GenericViewSet, mixins.ListModelMixin):
    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('limit', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, default=10),
        ],
        responses={200: openapi.Response('OK')}
    )
    def list(self, request, *args, **kwargs):
        limit_param = request.GET.get('limit')
        sort_mode = request.GET.get('sort', 'total_points')
        try:
            page = int(request.GET.get('page', 1))
        except (TypeError, ValueError):
            page = 1
        try:
            page_size = int(request.GET.get('page_size', 50))
        except (TypeError, ValueError):
            page_size = 50
        page = max(page, 1)
        page_size = min(max(page_size, 1), 50)

        rows_qs = UserMovie.objects.filter(score__gt=0) \
            .exclude(status=UserMovie.STATUS_NOT_WATCHED) \
            .values(
                'movie__tmdb_id',
                'movie__tmdb_name',
                'movie__tmdb_poster_path',
                'movie__tmdb_backdrop_path',
                'movie__tmdb_release_date',
                'movie__tmdb_overview',
                'movie__tmdb_score',
            ) \
            .annotate(
                ratings_count=Count('id'),
                average_user_score=Avg('score'),
                total_points=Sum('score'),
                platform_score=Coalesce('movie__tmdb_score', Value(-1), output_field=IntegerField()),
            )

        if sort_mode == 'average_score':
            rows_qs = rows_qs.order_by('-average_user_score', '-total_points', '-platform_score', '-ratings_count', 'movie__tmdb_name')
        else:
            rows_qs = rows_qs.order_by('-total_points', '-average_user_score', '-platform_score', '-ratings_count', 'movie__tmdb_name')

        if limit_param is not None:
            try:
                limit = int(limit_param)
            except (TypeError, ValueError):
                limit = 10
            limit = min(max(limit, 1), 20)
            rows = rows_qs[:limit]
            total_count = len(rows)
        else:
            paginator = Paginator(rows_qs, page_size)
            paginator_page = paginator.get_page(page)
            rows = list(paginator_page.object_list)
            total_count = paginator.count

        movie_ids = [row.get('movie__tmdb_id') for row in rows if row.get('movie__tmdb_id') is not None]
        user_status_by_movie_id = {}
        if movie_ids and request.user and request.user.is_authenticated:
            user_movies = UserMovie.objects.filter(user=request.user, movie__tmdb_id__in=movie_ids).values('movie__tmdb_id', 'status')
            user_status_by_movie_id = {row['movie__tmdb_id']: row['status'] for row in user_movies}

        results = [{
            'id': row.get('movie__tmdb_id'),
            'name': row.get('movie__tmdb_name'),
            'poster_path': get_proxy_url(request, row.get('movie__tmdb_poster_path') or ''),
            'backdrop_path': get_proxy_url(request, row.get('movie__tmdb_backdrop_path') or ''),
            'release_date': row.get('movie__tmdb_release_date'),
            'overview': row.get('movie__tmdb_overview') or '',
            'user_status': user_status_by_movie_id.get(row.get('movie__tmdb_id')),
            'ratings_count': int(row.get('ratings_count') or 0),
            'average_user_score': round(float(row.get('average_user_score') or 0), 1),
            'total_points': int(row.get('total_points') or 0),
            'platform_score': row.get('movie__tmdb_score'),
        } for row in rows]

        return Response({
            'results': results,
            'count': total_count,
            'page': page if limit_param is None else 1,
            'page_size': page_size if limit_param is None else len(results),
            'sort': sort_mode,
        }, status=status.HTTP_200_OK)
