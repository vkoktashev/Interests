from asgiref.sync import sync_to_async
from django.contrib.postgres.search import TrigramSimilarity
from django.core.paginator import Paginator
from django.db.models import Avg, Count, F, IntegerField, Q, TextField, Value
from django.db.models.functions import Coalesce, Greatest, NullIf

from games.models import Game, GameGenre, UserGame
from games.serializers import FollowedUserGameSerializer, GameSerializer, UserGameSerializer
from users.functions import get_public_non_followed_user_ids
from users.models import UserFollow
from utils.rating import get_imdb_weighted_score_annotation


def attach_games_user_status(user, results, ids_are_internal=False):
    for result in results:
        result['user_status'] = None
    if not results or not user.is_authenticated:
        return

    if ids_are_internal:
        game_ids = [result.get('id') for result in results if result.get('id') is not None]
        user_games = UserGame.objects.filter(user=user, game_id__in=game_ids) \
            .values('game_id', 'status')
        status_by_id = {row['game_id']: row['status'] for row in user_games}
        for result in results:
            result['user_status'] = status_by_id.get(result.get('id'))
        return

    igdb_ids = [result.get('id') for result in results if result.get('id') is not None]
    slugs = [result.get('slug') for result in results if result.get('slug')]
    user_games = UserGame.objects.filter(user=user).filter(
        Q(game__igdb_id__in=igdb_ids)
        | Q(game__igdb_slug__in=slugs)
        | Q(game__rawg_slug__in=slugs)
    ).values('game__igdb_id', 'game__igdb_slug', 'game__rawg_slug', 'status')
    status_by_igdb_id = {
        row['game__igdb_id']: row['status']
        for row in user_games
        if row['game__igdb_id'] is not None
    }
    status_by_slug = {}
    for row in user_games:
        if row['game__igdb_slug']:
            status_by_slug[row['game__igdb_slug']] = row['status']
        if row['game__rawg_slug']:
            status_by_slug[row['game__rawg_slug']] = row['status']
    for result in results:
        result['user_status'] = status_by_igdb_id.get(result.get('id')) \
            or status_by_slug.get(result.get('slug'))


def get_database_search_results(user, query, page, page_size):
    if not query:
        return []

    games = Game.objects.annotate(
        search_name=Coalesce(
            NullIf('igdb_name', Value('')),
            NullIf('rawg_slug', Value('')),
            Value(''),
        ),
        search_slug=Coalesce(
            NullIf('igdb_slug', Value('')),
            NullIf('rawg_slug', Value('')),
            Value(''),
        ),
    ).annotate(
        similarity_name=TrigramSimilarity('search_name', query),
        similarity_slug=TrigramSimilarity('search_slug', query),
    ).annotate(
        similarity=Greatest('similarity_name', 'similarity_slug'),
    ).filter(
        Q(search_name__icontains=query)
        | Q(search_slug__icontains=query)
        | Q(similarity__gt=0.1)
    ).order_by('-similarity')

    paginator_page = Paginator(games, page_size).get_page(page)
    results = GameSerializer(paginator_page.object_list, many=True).data
    attach_games_user_status(user, results, ids_are_internal=True)
    return results


async def get_game_social_payload(slug, user):
    return await sync_to_async(_get_game_social_payload)(slug, user)


def _get_game_social_payload(slug, user):
    game = Game.objects.filter(igdb_slug=slug).first()
    if game is None:
        return {'user_info': None, 'friends_info': (), 'users_info': ()}

    user_game = UserGame.objects.exclude(status=UserGame.STATUS_NOT_PLAYED) \
        .filter(user=user, game=game).first()
    user_info = UserGameSerializer(user_game).data if user_game is not None else None

    followed_user_ids = UserFollow.objects.filter(
        user=user,
        is_following=True,
    ).values('followed_user')
    followed_user_games = UserGame.objects.select_related('user') \
        .filter(user__in=followed_user_ids, game=game) \
        .exclude(status=UserGame.STATUS_NOT_PLAYED)
    friends_info = FollowedUserGameSerializer(followed_user_games, many=True).data

    public_user_games = UserGame.objects.select_related('user') \
        .filter(user__in=get_public_non_followed_user_ids(user), game=game) \
        .exclude(status=UserGame.STATUS_NOT_PLAYED) \
        .order_by('-updated_at')[:20]
    users_info = FollowedUserGameSerializer(public_user_games, many=True).data
    return {
        'user_info': user_info,
        'friends_info': friends_info,
        'users_info': users_info,
    }


def get_top_rated_games_payload(user, limit_value, page_value, page_size_value):
    page = _bounded_int(page_value, default=1, minimum=1)
    page_size = _bounded_int(page_size_value, default=50, minimum=1, maximum=50)
    base_qs = UserGame.objects.filter(score__gt=0) \
        .exclude(status=UserGame.STATUS_NOT_PLAYED)
    global_average_score = base_qs.aggregate(value=Avg('score')).get('value') or 0
    rows_qs = base_qs.values('game_id').annotate(
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
        game_backdrop=Coalesce(
            'game__igdb_cover_url',
            Value('', output_field=TextField()),
            output_field=TextField(),
        ),
        game_poster=Coalesce(
            'game__igdb_cover_url',
            Value('', output_field=TextField()),
            output_field=TextField(),
        ),
        game_release_date=F('game__igdb_release_date'),
        game_release_date_display=F('game__igdb_release_date_display'),
        game_platforms=Coalesce(
            'game__igdb_platforms',
            Value('', output_field=TextField()),
            output_field=TextField(),
        ),
        ratings_count=Count('id'),
        average_user_score=Avg('score'),
        platform_score=Coalesce(
            'game__igdb_rating',
            'game__igdb_aggregated_rating',
            Value(-1),
            output_field=IntegerField(),
        ),
    ).annotate(
        weighted_score=get_imdb_weighted_score_annotation(global_average_score),
    ).order_by(
        '-weighted_score',
        '-platform_score',
        '-ratings_count',
        '-average_user_score',
        'game_name',
    )

    if limit_value is not None:
        limit = _bounded_int(limit_value, default=10, minimum=1, maximum=20)
        rows = list(rows_qs[:limit])
        total_count = len(rows)
    else:
        paginator = Paginator(rows_qs, page_size)
        paginator_page = paginator.get_page(page)
        rows = list(paginator_page.object_list)
        total_count = paginator.count

    game_ids = [row['game_id'] for row in rows if row.get('game_id') is not None]
    genres_by_game_id = _get_genres_by_game_id(game_ids)
    status_by_game_id = _get_status_by_game_id(user, game_ids)
    results = [{
        'id': row.get('game_slug'),
        'name': row.get('game_name') or 'Без названия',
        'poster_path': row.get('game_poster') or row.get('game_backdrop') or '',
        'backdrop_path': row.get('game_backdrop') or '',
        'release_date': row.get('game_release_date'),
        'release_date_display': row.get('game_release_date_display') or '',
        'genres': ', '.join(genres_by_game_id.get(row.get('game_id'), [])),
        'platforms': row.get('game_platforms') or '',
        'user_status': status_by_game_id.get(row.get('game_id')),
        'ratings_count': int(row.get('ratings_count') or 0),
        'average_user_score': round(float(row.get('average_user_score') or 0), 1),
        'weighted_score': round(float(row.get('weighted_score') or 0), 2),
        'platform_score': row.get('platform_score'),
    } for row in rows]
    return {
        'results': results,
        'count': total_count,
        'page': page if limit_value is None else 1,
        'page_size': page_size if limit_value is None else len(results),
        'sort': 'imdb',
    }


def _get_genres_by_game_id(game_ids):
    result = {}
    game_genres = GameGenre.objects.filter(game_id__in=game_ids) \
        .select_related('genre').order_by('game_id', 'genre__igdb_name')
    for game_genre in game_genres:
        genres = result.setdefault(game_genre.game_id, [])
        if len(genres) < 4:
            genres.append(game_genre.genre.igdb_name)
    return result


def _get_status_by_game_id(user, game_ids):
    if not game_ids or not user or not user.is_authenticated:
        return {}
    return {
        row['game_id']: row['status']
        for row in UserGame.objects.filter(user=user, game_id__in=game_ids)
        .values('game_id', 'status')
    }


def _bounded_int(value, default, minimum, maximum=None):
    try:
        result = int(value)
    except (TypeError, ValueError):
        result = default
    result = max(result, minimum)
    return min(result, maximum) if maximum is not None else result
