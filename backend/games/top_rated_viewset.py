from django.core.paginator import Paginator
from django.db.models import Count, Avg, Sum, Value, IntegerField
from django.db.models.functions import Coalesce
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, status
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from games.models import UserGame, GameGenre


class TopRatedGamesViewSet(GenericViewSet, mixins.ListModelMixin):
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

        rows_qs = UserGame.objects.filter(score__gt=0) \
            .exclude(status=UserGame.STATUS_NOT_PLAYED) \
            .values(
                'game__rawg_slug',
                'game__rawg_name',
                'game__rawg_backdrop_path',
                'game__rawg_poster_path',
                'game__rawg_release_date',
                'game__rawg_metacritic',
                'game__rawg_platforms',
                'game_id',
            ) \
            .annotate(
                ratings_count=Count('id'),
                average_user_score=Avg('score'),
                total_points=Sum('score'),
                platform_score=Coalesce('game__rawg_metacritic', Value(-1), output_field=IntegerField()),
            )

        if sort_mode == 'average_score':
            rows_qs = rows_qs.order_by('-average_user_score', '-total_points', '-platform_score', '-ratings_count', 'game__rawg_name')
        else:
            rows_qs = rows_qs.order_by('-total_points', '-average_user_score', '-platform_score', '-ratings_count', 'game__rawg_name')

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

        game_ids = [row.get('game_id') for row in rows if row.get('game_id') is not None]
        genres_by_game_id = {}
        user_status_by_game_id = {}
        if game_ids:
            game_genres = GameGenre.objects.filter(game_id__in=game_ids).select_related('genre').order_by('game_id', 'genre__rawg_name')
            for game_genre in game_genres:
                genres_by_game_id.setdefault(game_genre.game_id, [])
                if len(genres_by_game_id[game_genre.game_id]) < 4:
                    genres_by_game_id[game_genre.game_id].append(game_genre.genre.rawg_name)

            if request.user and request.user.is_authenticated:
                user_games = UserGame.objects.filter(user=request.user, game_id__in=game_ids).values('game_id', 'status')
                user_status_by_game_id = {row['game_id']: row['status'] for row in user_games}

        results = [{
            'id': row.get('game__rawg_slug'),
            'name': row.get('game__rawg_name'),
            'poster_path': row.get('game__rawg_poster_path') or row.get('game__rawg_backdrop_path') or '',
            'backdrop_path': row.get('game__rawg_backdrop_path') or '',
            'release_date': row.get('game__rawg_release_date'),
            'genres': ', '.join(genres_by_game_id.get(row.get('game_id'), [])),
            'platforms': row.get('game__rawg_platforms') or '',
            'user_status': user_status_by_game_id.get(row.get('game_id')),
            'ratings_count': int(row.get('ratings_count') or 0),
            'average_user_score': round(float(row.get('average_user_score') or 0), 1),
            'total_points': int(row.get('total_points') or 0),
            'platform_score': row.get('game__rawg_metacritic'),
        } for row in rows]

        return Response({
            'results': results,
            'count': total_count,
            'page': page if limit_param is None else 1,
            'page_size': page_size if limit_param is None else len(results),
            'sort': sort_mode,
        }, status=status.HTTP_200_OK)
