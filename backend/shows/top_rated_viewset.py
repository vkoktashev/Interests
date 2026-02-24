from django.db.models import Count, Avg, Sum
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
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
        try:
            limit = int(request.GET.get('limit', 10))
        except (TypeError, ValueError):
            limit = 10
        limit = min(max(limit, 1), 20)

        rows = UserShow.objects.filter(score__gt=0) \
            .exclude(status=UserShow.STATUS_NOT_WATCHED) \
            .values(
                'show__tmdb_id',
                'show__tmdb_name',
                'show__tmdb_poster_path',
                'show__tmdb_backdrop_path',
                'show__tmdb_release_date',
                'show__tmdb_overview',
            ) \
            .annotate(
                ratings_count=Count('id'),
                average_user_score=Avg('score'),
                total_points=Sum('score'),
            ) \
            .order_by('-total_points', '-average_user_score', '-ratings_count', 'show__tmdb_name')[:limit]

        results = [{
            'id': row.get('show__tmdb_id'),
            'name': row.get('show__tmdb_name'),
            'poster_path': get_proxy_url(request, row.get('show__tmdb_poster_path') or ''),
            'backdrop_path': get_proxy_url(request, row.get('show__tmdb_backdrop_path') or ''),
            'release_date': row.get('show__tmdb_release_date'),
            'overview': row.get('show__tmdb_overview') or '',
            'ratings_count': int(row.get('ratings_count') or 0),
            'average_user_score': round(float(row.get('average_user_score') or 0), 1),
            'total_points': int(row.get('total_points') or 0),
        } for row in rows]

        return Response({'results': results}, status=status.HTTP_200_OK)
