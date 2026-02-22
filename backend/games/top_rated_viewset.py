from django.db.models import Count, Avg, Sum
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, status
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from games.models import UserGame


class TopRatedGamesViewSet(GenericViewSet, mixins.ListModelMixin):
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

        rows = UserGame.objects.filter(score__gt=0) \
            .exclude(status=UserGame.STATUS_NOT_PLAYED) \
            .values(
                'game__rawg_slug',
                'game__rawg_name',
                'game__rawg_backdrop_path',
                'game__rawg_poster_path',
                'game__rawg_release_date',
            ) \
            .annotate(
                ratings_count=Count('id'),
                average_user_score=Avg('score'),
                total_points=Sum('score'),
            ) \
            .order_by('-total_points', '-average_user_score', '-ratings_count', 'game__rawg_name')[:limit]

        results = [{
            'id': row.get('game__rawg_slug'),
            'name': row.get('game__rawg_name'),
            'poster_path': row.get('game__rawg_poster_path') or row.get('game__rawg_backdrop_path') or '',
            'backdrop_path': row.get('game__rawg_backdrop_path') or '',
            'release_date': row.get('game__rawg_release_date'),
            'ratings_count': int(row.get('ratings_count') or 0),
            'average_user_score': round(float(row.get('average_user_score') or 0), 1),
            'total_points': int(row.get('total_points') or 0),
        } for row in rows]

        return Response({'results': results}, status=status.HTTP_200_OK)
