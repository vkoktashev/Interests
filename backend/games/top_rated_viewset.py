from django.core.paginator import Paginator
from django.db.models import Count, Avg, Value, IntegerField, TextField, F
from django.db.models.functions import Coalesce, NullIf
from utils.swagger import openapi, swagger_auto_schema
from utils.rating import get_imdb_weighted_score_annotation
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

        base_qs = UserGame.objects.filter(score__gt=0) \
            .exclude(status=UserGame.STATUS_NOT_PLAYED)
        global_average_score = base_qs.aggregate(value=Avg('score')).get('value') or 0

        rows_qs = base_qs \
            .values(
                'game_id',
            ) \
            .annotate(
                game_slug=Coalesce(
                    NullIf('game__igdb_slug', Value('')),
                    Value('', output_field=TextField()),
                    output_field=TextField(),
                ),
                game_name=Coalesce(
                    NullIf('game__igdb_name', Value('')),
                    Value('Без названия'),
                    output_field=TextField(),
                ),
                game_backdrop=Coalesce('game__igdb_cover_url', Value('', output_field=TextField()), output_field=TextField()),
                game_poster=Coalesce(
                    'game__igdb_cover_url',
                    Value('', output_field=TextField()),
                    output_field=TextField(),
                ),
                game_release_date=F('game__igdb_release_date'),
                game_platforms=Coalesce('game__igdb_platforms', Value('', output_field=TextField()), output_field=TextField()),
                ratings_count=Count('id'),
                average_user_score=Avg('score'),
                platform_score=Coalesce('game__igdb_rating', 'game__igdb_aggregated_rating',
                                        Value(-1), output_field=IntegerField()),
            )
        rows_qs = rows_qs.annotate(
            weighted_score=get_imdb_weighted_score_annotation(global_average_score),
        ).order_by('-weighted_score', '-platform_score', '-ratings_count', '-average_user_score', 'game_name')

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
            game_genres = GameGenre.objects.filter(game_id__in=game_ids).select_related('genre').order_by('game_id', 'genre__igdb_name')
            for game_genre in game_genres:
                genres_by_game_id.setdefault(game_genre.game_id, [])
                if len(genres_by_game_id[game_genre.game_id]) < 4:
                    genres_by_game_id[game_genre.game_id].append(game_genre.genre.igdb_name)

            if request.user and request.user.is_authenticated:
                user_games = UserGame.objects.filter(user=request.user, game_id__in=game_ids).values('game_id', 'status')
                user_status_by_game_id = {row['game_id']: row['status'] for row in user_games}

        results = [{
            'id': row.get('game_slug'),
            'name': row.get('game_name') or 'Без названия',
            'poster_path': row.get('game_poster') or row.get('game_backdrop') or '',
            'backdrop_path': row.get('game_backdrop') or '',
            'release_date': row.get('game_release_date'),
            'genres': ', '.join(genres_by_game_id.get(row.get('game_id'), [])),
            'platforms': row.get('game_platforms') or '',
            'user_status': user_status_by_game_id.get(row.get('game_id')),
            'ratings_count': int(row.get('ratings_count') or 0),
            'average_user_score': round(float(row.get('average_user_score') or 0), 1),
            'weighted_score': round(float(row.get('weighted_score') or 0), 2),
            'platform_score': row.get('platform_score'),
        } for row in rows]

        return Response({
            'results': results,
            'count': total_count,
            'page': page if limit_param is None else 1,
            'page_size': page_size if limit_param is None else len(results),
            'sort': 'imdb',
        }, status=status.HTTP_200_OK)
