from datetime import timedelta

from django.utils import timezone
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from requests import HTTPError, ConnectionError, Timeout
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from movies.functions import get_movie_new_fields, update_movie_genres, get_tmdb_movie, get_tmdb_movie_videos, \
    get_cast_crew, update_movie_people, get_tmdb_movie_reviews, get_tmdb_movie_recommendations
from movies.models import UserMovie, Movie, MoviePerson
from movies.serializers import UserMovieReadSerializer, FollowedUserMovieSerializer, UserMovieWriteSerializer
from movies.tasks import refresh_movie_details
from proxy.functions import get_proxy_url
from users.models import UserFollow
from utils.constants import ERROR, MOVIE_NOT_FOUND, TMDB_UNAVAILABLE, TMDB_POSTER_PATH_PREFIX, TMDB_BACKDROP_PATH_PREFIX
from utils.functions import update_fields_if_needed

MOVIE_DETAILS_REFRESH_INTERVAL = timedelta(hours=4)


class MovieViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    queryset = UserMovie.objects.all()
    serializer_class = UserMovieReadSerializer
    lookup_field = 'tmdb_id'

    @swagger_auto_schema(
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Movie not found'),
            503: openapi.Response('TMDB unavailable'),
        }
    )
    def retrieve(self, request, *args, **kwargs):
        tmdb_id = kwargs.get('tmdb_id')
        movie = Movie.objects.filter(tmdb_id=tmdb_id).first()

        should_fetch_from_tmdb = movie is None or movie.tmdb_last_update is None

        if should_fetch_from_tmdb:
            try:
                tmdb_movie = get_tmdb_movie(tmdb_id)
                tmdb_cast_crew = get_cast_crew(tmdb_id)
                tmdb_movie_videos = get_tmdb_movie_videos(tmdb_id)
            except HTTPError as e:
                error_code = int(e.args[0].split(' ', 1)[0])
                if error_code == 404:
                    return Response({ERROR: MOVIE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
                return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            except (ConnectionError, Timeout):
                return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            new_fields = get_movie_new_fields(tmdb_movie, tmdb_movie_videos)

            movie, created = Movie.objects.filter().get_or_create(tmdb_id=tmdb_movie.get('id'),
                                                                  defaults=new_fields)
            if not created:
                update_fields_if_needed(movie, new_fields)

            update_movie_genres(movie, tmdb_movie)
            update_movie_people(movie, tmdb_cast_crew)

        response = Response(parse_movie(movie, request))

        if movie.tmdb_last_update and movie.tmdb_last_update <= timezone.now() - MOVIE_DETAILS_REFRESH_INTERVAL:
            movie_id = movie.tmdb_id
            response.add_post_render_callback(lambda _: enqueue_movie_refresh(movie_id))

        return response

    @swagger_auto_schema(responses={status.HTTP_200_OK: FollowedUserMovieSerializer(many=True)})
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def user_info(self, request, *args, **kwargs):
        try:
            movie = Movie.objects.get(tmdb_id=kwargs.get('tmdb_id'))

            try:
                user_movie = UserMovie.objects.exclude(status=UserMovie.STATUS_NOT_WATCHED).get(user=request.user,
                                                                                                movie=movie)
                user_info = self.get_serializer(user_movie).data
            except UserMovie.DoesNotExist:
                user_info = None

            user_follow_query = UserFollow.objects.filter(user=request.user, is_following=True).values('followed_user')
            followed_user_movies = UserMovie.objects.select_related('user').filter(user__in=user_follow_query, movie=movie) \
                .exclude(status=UserMovie.STATUS_NOT_WATCHED)
            serializer = FollowedUserMovieSerializer(followed_user_movies, many=True)
            friends_info = serializer.data
        except (Movie.DoesNotExist, ValueError):
            user_info = None
            friends_info = ()

        return Response({'user_info': user_info, 'friends_info': friends_info})

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('page', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, required=False),
        ],
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Movie not found'),
            503: openapi.Response('TMDB unavailable'),
        }
    )
    @action(detail=True, methods=['get'])
    def tmdb_reviews(self, request, *args, **kwargs):
        tmdb_id = kwargs.get('tmdb_id')
        try:
            page = int(request.query_params.get('page', 1) or 1)
        except (TypeError, ValueError):
            page = 1
        page = max(page, 1)

        try:
            payload = get_tmdb_movie_reviews(tmdb_id, page=page)
        except HTTPError as e:
            error_code = int(e.args[0].split(' ', 1)[0])
            if error_code == 404:
                return Response({ERROR: MOVIE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except (ConnectionError, Timeout, ValueError):
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        reviews = []
        for item in (payload.get('results') or []):
            author_details = item.get('author_details') or {}
            avatar_path = author_details.get('avatar_path') or ''
            # TMDB may return "/https://..." for external avatars.
            if isinstance(avatar_path, str) and avatar_path.startswith('/http'):
                avatar_path = avatar_path[1:]

            reviews.append({
                'id': item.get('id'),
                'author': item.get('author') or author_details.get('username') or 'TMDB user',
                'username': author_details.get('username') or '',
                'rating': author_details.get('rating'),
                'avatar_path': avatar_path,
                'content': item.get('content') or '',
                'created_at': item.get('created_at'),
                'updated_at': item.get('updated_at'),
                'url': item.get('url') or '',
            })

        return Response({
            'page': payload.get('page') or page,
            'total_pages': payload.get('total_pages') or 1,
            'total_results': payload.get('total_results') or len(reviews),
            'results': reviews,
        })

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('page', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, required=False),
        ],
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Movie not found'),
            503: openapi.Response('TMDB unavailable'),
        }
    )
    @action(detail=True, methods=['get'])
    def tmdb_recommendations(self, request, *args, **kwargs):
        tmdb_id = kwargs.get('tmdb_id')
        try:
            page = int(request.query_params.get('page', 1) or 1)
        except (TypeError, ValueError):
            page = 1
        page = max(page, 1)

        try:
            payload = get_tmdb_movie_recommendations(tmdb_id, page=page)
        except HTTPError as e:
            error_code = int(e.args[0].split(' ', 1)[0])
            if error_code == 404:
                return Response({ERROR: MOVIE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except (ConnectionError, Timeout, ValueError):
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        recommendations = []
        for item in (payload.get('results') or []):
            recommendations.append({
                'id': item.get('id'),
                'name': item.get('title') or '',
                'original_name': item.get('original_title') or '',
                'overview': item.get('overview') or '',
                'release_date': item.get('release_date') or '',
                'vote_average': item.get('vote_average'),
                'vote_count': item.get('vote_count') or 0,
                'poster_path': get_proxy_url(request, TMDB_POSTER_PATH_PREFIX, item.get('poster_path')),
                'backdrop_path': get_proxy_url(request, TMDB_BACKDROP_PATH_PREFIX, item.get('backdrop_path')),
            })

        return Response({
            'page': payload.get('page') or page,
            'total_pages': payload.get('total_pages') or 1,
            'total_results': payload.get('total_results') or len(recommendations),
            'results': recommendations,
        })

    @swagger_auto_schema(
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'status': openapi.Schema(type=openapi.TYPE_STRING,
                                         enum=[UserMovie.STATUS_WATCHED, UserMovie.STATUS_STOPPED,
                                               UserMovie.STATUS_GOING, UserMovie.STATUS_NOT_WATCHED]),
                'score': openapi.Schema(type=openapi.TYPE_INTEGER),
                'review': openapi.Schema(type=openapi.TYPE_STRING),
            },
        ),
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Movie not found'),
        }
    )
    def update(self, request, *args, **kwargs):
        try:
            movie = Movie.objects.get(tmdb_id=kwargs.get('tmdb_id'))
        except Movie.DoesNotExist:
            return Response({ERROR: MOVIE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()
        data.update({'user': request.user.pk,
                     'movie': movie.pk})

        try:
            user_movie = UserMovie.objects.get(user=request.user, movie=movie)
            serializer = UserMovieWriteSerializer(user_movie, data=data)
        except UserMovie.DoesNotExist:
            serializer = UserMovieWriteSerializer(data=data)

        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


def parse_movie(movie, request):
    genres = [movie_genre.genre.tmdb_name for movie_genre in movie.moviegenre_set.select_related('genre').all()]
    cast_names = [movie_person.person.name for movie_person in movie.movieperson_set.select_related('person')
                  .filter(role=MoviePerson.ROLE_ACTOR).order_by('sort_order')]
    director_names = [movie_person.person.name for movie_person in movie.movieperson_set.select_related('person')
                      .filter(role=MoviePerson.ROLE_DIRECTOR).order_by('sort_order')]
    new_movie = {
        'id': movie.tmdb_id,
        'name': movie.tmdb_name,
        'original_name': movie.tmdb_original_name,
        'overview': movie.tmdb_overview,
        'runtime': movie.tmdb_runtime,
        'release_date': format_date(movie.tmdb_release_date),
        'score': movie.tmdb_score,
        'tagline': movie.tmdb_tagline,
        'backdrop_path': get_proxy_url(request, movie.tmdb_backdrop_path),
        'poster_path': get_proxy_url(request, movie.tmdb_poster_path),
        'genres': ', '.join(genres),
        'production_companies': movie.tmdb_production_companies,
        'cast': ', '.join(cast_names),
        'directors': ', '.join(director_names),
        'videos': movie.tmdb_videos
    }

    return new_movie


def enqueue_movie_refresh(tmdb_id):
    try:
        refresh_movie_details.delay(tmdb_id)
    except Exception:
        pass


def format_date(value):
    if value is None:
        return None
    if isinstance(value, str):
        parts = value.split('-')
        if len(parts) == 3:
            return '.'.join(reversed(parts))
        return value
    return value.strftime('%d.%m.%Y')
