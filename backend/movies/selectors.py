from django.contrib.postgres.search import TrigramSimilarity
from django.core.paginator import Paginator
from django.db.models import Avg, Count, IntegerField, Q, Value
from django.db.models.functions import Coalesce, Greatest

from movies.models import Movie, MoviePerson, UserMovie
from movies.serializers import (
    FollowedUserMovieSerializer,
    MovieSerializer,
    UserMovieReadSerializer,
)
from proxy.functions import get_proxy_url
from users.functions import get_public_non_followed_user_ids
from users.models import UserFollow
from utils.constants import TMDB_BACKDROP_PATH_PREFIX, TMDB_POSTER_PATH_PREFIX
from utils.functions import resolve_display_name
from utils.rating import get_imdb_weighted_score_annotation


def get_movie_payload(movie, request):
    genres = [
        movie_genre.genre.tmdb_name
        for movie_genre in movie.moviegenre_set.select_related('genre').all()
    ]
    cast_people = _get_movie_people(movie, MoviePerson.ROLE_ACTOR, request)
    directors_people = _get_movie_people(movie, MoviePerson.ROLE_DIRECTOR, request)

    return {
        'id': movie.tmdb_id,
        'object_id': movie.pk,
        'imdb_id': movie.imdb_id,
        'name': resolve_display_name(
            movie.tmdb_name,
            movie.tmdb_original_name,
            movie.tmdb_name_en,
            movie.tmdb_original_language,
        ),
        'original_name': movie.tmdb_original_name,
        'overview': movie.tmdb_overview or movie.tmdb_overview_en,
        'runtime': movie.tmdb_runtime,
        'release_date': _format_date(movie.tmdb_release_date),
        'digital_release_date': _format_date(movie.tmdb_digital_release_date),
        'score': movie.tmdb_score,
        'tagline': movie.tmdb_tagline,
        'backdrop_path': get_proxy_url(request, movie.tmdb_backdrop_path),
        'poster_path': get_proxy_url(request, movie.tmdb_poster_path),
        'genres': ', '.join(genres),
        'production_companies': movie.tmdb_production_companies,
        'cast': ', '.join(person['name'] for person in cast_people),
        'directors': ', '.join(person['name'] for person in directors_people),
        'cast_people': cast_people,
        'directors_people': directors_people,
    }


def get_movie_social_payload(tmdb_id, user, request):
    try:
        movie = Movie.objects.get(tmdb_id=tmdb_id)
    except (Movie.DoesNotExist, TypeError, ValueError):
        return {'user_info': None, 'friends_info': (), 'users_info': ()}

    user_movie = UserMovie.objects.exclude(status=UserMovie.STATUS_NOT_WATCHED) \
        .filter(user=user, movie=movie).first()
    user_info = UserMovieReadSerializer(user_movie, context={'request': request}).data \
        if user_movie is not None else None

    followed_user_ids = UserFollow.objects.filter(
        user=user,
        is_following=True,
    ).values('followed_user')
    followed_user_movies = UserMovie.objects.select_related('user') \
        .filter(user__in=followed_user_ids, movie=movie) \
        .exclude(status=UserMovie.STATUS_NOT_WATCHED)
    friends_info = FollowedUserMovieSerializer(followed_user_movies, many=True).data

    public_user_movies = UserMovie.objects.select_related('user') \
        .filter(user__in=get_public_non_followed_user_ids(user), movie=movie) \
        .exclude(status=UserMovie.STATUS_NOT_WATCHED) \
        .order_by('-updated_at')[:20]
    users_info = FollowedUserMovieSerializer(public_user_movies, many=True).data
    return {
        'user_info': user_info,
        'friends_info': friends_info,
        'users_info': users_info,
    }


def get_recommendations_payload(payload, page, request):
    recommendations = [{
        'id': item.get('id'),
        'name': item.get('title') or '',
        'original_name': item.get('original_title') or '',
        'overview': item.get('overview') or '',
        'release_date': item.get('release_date') or '',
        'vote_average': item.get('vote_average'),
        'vote_count': item.get('vote_count') or 0,
        'poster_path': get_proxy_url(request, TMDB_POSTER_PATH_PREFIX, item.get('poster_path')),
        'backdrop_path': get_proxy_url(request, TMDB_BACKDROP_PATH_PREFIX, item.get('backdrop_path')),
    } for item in (payload.get('results') or [])]
    return {
        'page': payload.get('page') or page,
        'total_pages': payload.get('total_pages') or 1,
        'total_results': payload.get('total_results') or len(recommendations),
        'results': recommendations,
    }


def get_database_movie_search_results(user, query, page, page_size):
    if not query:
        return []

    movies = Movie.objects.annotate(
        similarity=Greatest(
            TrigramSimilarity('tmdb_name', query),
            TrigramSimilarity('tmdb_original_name', query),
        )
    ).filter(
        Q(tmdb_name__icontains=query)
        | Q(tmdb_original_name__icontains=query)
        | Q(similarity__gt=0.1)
    ).order_by('-similarity', 'tmdb_name')
    paginator_page = Paginator(movies, page_size).get_page(page)
    results = MovieSerializer(paginator_page.object_list, many=True).data
    attach_movies_user_status(user, results)
    return results


def get_tmdb_movie_search_payload(payload, user, request):
    results = []
    for source_item in payload.get('results', []):
        item = dict(source_item)
        item['backdrop_path'] = get_proxy_url(
            request,
            TMDB_BACKDROP_PATH_PREFIX,
            item.get('backdrop_path'),
        )
        item['poster_path'] = get_proxy_url(
            request,
            TMDB_POSTER_PATH_PREFIX,
            item.get('poster_path'),
        )
        results.append(item)
    attach_movies_user_status(user, results)

    response = dict(payload)
    response['results'] = results
    return response


def get_top_rated_movies_payload(user, request, limit_value, page_value, page_size_value):
    page = _bounded_int(page_value, default=1, minimum=1)
    page_size = _bounded_int(page_size_value, default=50, minimum=1, maximum=50)
    base_qs = UserMovie.objects.filter(score__gt=0) \
        .exclude(status=UserMovie.STATUS_NOT_WATCHED)
    global_average_score = base_qs.aggregate(value=Avg('score')).get('value') or 0
    rows_qs = base_qs.values(
        'movie__tmdb_id',
        'movie__tmdb_name',
        'movie__tmdb_poster_path',
        'movie__tmdb_backdrop_path',
        'movie__tmdb_release_date',
        'movie__tmdb_overview',
        'movie__tmdb_score',
    ).annotate(
        ratings_count=Count('id'),
        average_user_score=Avg('score'),
        platform_score=Coalesce(
            'movie__tmdb_score',
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
        'movie__tmdb_name',
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

    movie_ids = [
        row['movie__tmdb_id']
        for row in rows
        if row.get('movie__tmdb_id') is not None
    ]
    status_by_movie_id = _get_movie_status_by_tmdb_id(user, movie_ids)
    results = [{
        'id': row.get('movie__tmdb_id'),
        'name': row.get('movie__tmdb_name'),
        'poster_path': get_proxy_url(request, row.get('movie__tmdb_poster_path') or ''),
        'backdrop_path': get_proxy_url(request, row.get('movie__tmdb_backdrop_path') or ''),
        'release_date': row.get('movie__tmdb_release_date'),
        'overview': row.get('movie__tmdb_overview') or '',
        'user_status': status_by_movie_id.get(row.get('movie__tmdb_id')),
        'ratings_count': int(row.get('ratings_count') or 0),
        'average_user_score': round(float(row.get('average_user_score') or 0), 1),
        'weighted_score': round(float(row.get('weighted_score') or 0), 2),
        'platform_score': row.get('movie__tmdb_score'),
    } for row in rows]
    return {
        'results': results,
        'count': total_count,
        'page': page if limit_value is None else 1,
        'page_size': page_size if limit_value is None else len(results),
        'sort': 'imdb',
    }


def get_trending_movies_payload(payload, time_window, request):
    results = [{
        'id': item.get('id'),
        'name': item.get('title') or item.get('name') or '',
        'original_name': item.get('original_title') or item.get('original_name') or '',
        'poster_path': get_proxy_url(request, TMDB_POSTER_PATH_PREFIX, item.get('poster_path')),
        'backdrop_path': get_proxy_url(request, TMDB_BACKDROP_PATH_PREFIX, item.get('backdrop_path')),
        'release_date': item.get('release_date'),
        'vote_average': item.get('vote_average'),
        'vote_count': item.get('vote_count'),
        'overview': item.get('overview') or '',
    } for item in payload.get('results', [])[:10]]
    return {'time_window': time_window, 'results': results}


def attach_movies_user_status(user, results):
    for result in results:
        result['user_status'] = None
    if not results or not user.is_authenticated:
        return

    tmdb_ids = [result.get('id', result.get('tmdb_id')) for result in results]
    status_by_tmdb_id = _get_movie_status_by_tmdb_id(user, tmdb_ids)
    for result in results:
        tmdb_id = result.get('id', result.get('tmdb_id'))
        result['user_status'] = status_by_tmdb_id.get(tmdb_id)


def _get_movie_people(movie, role, request):
    result = []
    movie_people = movie.movieperson_set.select_related('person') \
        .filter(role=role).order_by('sort_order')
    for movie_person in movie_people:
        person_data = {
            'id': movie_person.person.id,
            'tmdb_id': movie_person.person.tmdb_id,
            'name': movie_person.person.name,
            'profile_path': get_proxy_url(request, movie_person.person.tmdb_profile_path),
        }
        if role == MoviePerson.ROLE_ACTOR:
            person_data['character'] = movie_person.character
        result.append(person_data)
    return result


def _format_date(value):
    if value is None:
        return None
    if isinstance(value, str):
        parts = value.split('-')
        return '.'.join(reversed(parts)) if len(parts) == 3 else value
    return value.strftime('%d.%m.%Y')


def _get_movie_status_by_tmdb_id(user, tmdb_ids):
    if not tmdb_ids or not user or not user.is_authenticated:
        return {}
    return {
        row['movie__tmdb_id']: row['status']
        for row in UserMovie.objects.filter(
            user=user,
            movie__tmdb_id__in=tmdb_ids,
        ).values('movie__tmdb_id', 'status')
    }


def _bounded_int(value, default, minimum, maximum=None):
    try:
        result = int(value)
    except (TypeError, ValueError):
        result = default
    result = max(result, minimum)
    return min(result, maximum) if maximum is not None else result
