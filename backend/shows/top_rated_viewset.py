from django.core.paginator import Paginator
from django.db.models import Count, Avg, Value, IntegerField
from django.db.models.functions import Coalesce
from utils.swagger import openapi, swagger_auto_schema
from utils.rating import get_imdb_weighted_score_annotation
from rest_framework import mixins, status
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from proxy.functions import get_proxy_url
from shows.models import UserShow


class TopRatedShowsViewSet(GenericViewSet, mixins.ListModelMixin):
    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('limit', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, default=10),
        ],
        responses={200: openapi.Response('OK')}
    )
    def list(self, request, *args, **kwargs):
        limit_param = request.GET.get('limit')
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

        base_qs = UserShow.objects.filter(score__gt=0) \
            .exclude(status=UserShow.STATUS_NOT_WATCHED)
        global_average_score = base_qs.aggregate(value=Avg('score')).get('value') or 0

        rows_qs = base_qs \
            .values(
                'show__tmdb_id',
                'show__tmdb_name',
                'show__tmdb_poster_path',
                'show__tmdb_backdrop_path',
                'show__tmdb_release_date',
                'show__tmdb_overview',
                'show__tmdb_score',
            ) \
            .annotate(
                ratings_count=Count('id'),
                average_user_score=Avg('score'),
                platform_score=Coalesce('show__tmdb_score', Value(-1), output_field=IntegerField()),
            )
        rows_qs = rows_qs.annotate(
            weighted_score=get_imdb_weighted_score_annotation(global_average_score),
        ).order_by('-weighted_score', '-platform_score', '-ratings_count', '-average_user_score', 'show__tmdb_name')

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

        show_ids = [row.get('show__tmdb_id') for row in rows if row.get('show__tmdb_id') is not None]
        user_status_by_show_id = {}
        if show_ids and request.user and request.user.is_authenticated:
            user_shows = UserShow.objects.filter(user=request.user, show__tmdb_id__in=show_ids).values('show__tmdb_id', 'status')
            user_status_by_show_id = {row['show__tmdb_id']: row['status'] for row in user_shows}

        results = [{
            'id': row.get('show__tmdb_id'),
            'name': row.get('show__tmdb_name'),
            'poster_path': get_proxy_url(request, row.get('show__tmdb_poster_path') or ''),
            'backdrop_path': get_proxy_url(request, row.get('show__tmdb_backdrop_path') or ''),
            'release_date': row.get('show__tmdb_release_date'),
            'overview': row.get('show__tmdb_overview') or '',
            'user_status': user_status_by_show_id.get(row.get('show__tmdb_id')),
            'ratings_count': int(row.get('ratings_count') or 0),
            'average_user_score': round(float(row.get('average_user_score') or 0), 1),
            'weighted_score': round(float(row.get('weighted_score') or 0), 2),
            'platform_score': row.get('show__tmdb_score'),
        } for row in rows]

        return Response({
            'results': results,
            'count': total_count,
            'page': page if limit_param is None else 1,
            'page_size': page_size if limit_param is None else len(results),
            'sort': 'imdb',
        }, status=status.HTTP_200_OK)
