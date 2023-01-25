import tmdbsimple as tmdb
from django.contrib.postgres.search import TrigramSimilarity
from django.core.cache import cache
from django.core.paginator import Paginator
from django.db.models.functions import Greatest
from drf_yasg.utils import swagger_auto_schema
from requests import HTTPError
from requests.exceptions import ConnectionError
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from movies.functions import get_movie_new_fields, get_tmdb_movie_key
from movies.models import Movie, UserMovie, Genre, MovieGenre
from movies.serializers import UserMovieSerializer, FollowedUserMovieSerializer, MovieSerializer
from proxy.functions import get_proxy_url
from users.models import UserFollow
from utils.constants import LANGUAGE, ERROR, MOVIE_NOT_FOUND, TMDB_UNAVAILABLE, CACHE_TIMEOUT, \
    TMDB_BACKDROP_PATH_PREFIX, TMDB_POSTER_PATH_PREFIX, DEFAULT_PAGE_SIZE, YOUTUBE_PREFIX
from utils.functions import update_fields_if_needed, objects_to_str, get_page_size
from utils.openapi_params import DEFAULT_PAGE_NUMBER


class SearchMoviesViewSet(GenericViewSet, mixins.ListModelMixin):
    @action(detail=False, methods=['get'])
    def tmdb(self, request, *args, **kwargs):
        query = request.GET.get('query', '')
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)
        try:
            results = get_movie_search_results(query=query, page=page)
        except HTTPError:
            results = None
        return Response(results, status=status.HTTP_200_OK)

    def list(self, request, *args, **kwargs):
        query = request.GET.get('query', '')
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)
        page_size = get_page_size(request.GET.get('page_size', DEFAULT_PAGE_SIZE))

        movies = Movie.objects \
            .annotate(similarity=Greatest(TrigramSimilarity('tmdb_name', query),
                                          TrigramSimilarity('tmdb_original_name', query))) \
            .filter(similarity__gt=0.1) \
            .order_by('-similarity')
        paginator_page = Paginator(movies, page_size).get_page(page)
        serializer = MovieSerializer(paginator_page.object_list, many=True)

        return Response(serializer.data)


class MovieViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    queryset = UserMovie.objects.all()
    serializer_class = UserMovieSerializer
    lookup_field = 'tmdb_id'

    def retrieve(self, request, *args, **kwargs):
        try:
            tmdb_movie, returned_from_cache = get_tmdb_movie(kwargs.get('tmdb_id'))
            tmdb_cast_crew = get_cast_crew(kwargs.get('tmdb_id'))
            tmdb_movie['cast'] = tmdb_cast_crew.get('cast')
            tmdb_movie['crew'] = tmdb_cast_crew.get('crew')
            tmdb_movie['videos'] = get_tmdb_movie_videos(kwargs.get('tmdb_id'))
        except HTTPError as e:
            error_code = int(e.args[0].split(' ', 1)[0])
            if error_code == 404:
                return Response({ERROR: MOVIE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ConnectionError:
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        new_fields = get_movie_new_fields(tmdb_movie)

        movie, created = Movie.objects.filter().get_or_create(tmdb_id=tmdb_movie.get('id'),
                                                              defaults=new_fields)
        if not created and not returned_from_cache:
            update_fields_if_needed(movie, new_fields)

        if created or not returned_from_cache:
            update_movie_genres(movie, tmdb_movie)

        return Response(parse_movie(tmdb_movie, request.scheme))

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
            followed_user_movies = UserMovie.objects.filter(user__in=user_follow_query, movie=movie) \
                .exclude(status=UserMovie.STATUS_NOT_WATCHED)
            serializer = FollowedUserMovieSerializer(followed_user_movies, many=True)
            friends_info = serializer.data
        except (Movie.DoesNotExist, ValueError):
            user_info = None
            friends_info = ()

        return Response({'user_info': user_info, 'friends_info': friends_info})

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
            serializer = self.get_serializer(user_movie, data=data)
        except UserMovie.DoesNotExist:
            serializer = self.get_serializer(data=data)

        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


def update_movie_genres(movie: Movie, tmdb_movie: dict) -> None:
    existing_movie_genres = MovieGenre.objects.filter(movie=movie)
    new_movie_genres = []
    movie_genres_to_delete_ids = []

    for genre in tmdb_movie.get('genres'):
        genre_obj, created = Genre.objects.get_or_create(tmdb_id=genre.get('id'),
                                                         defaults={
                                                             'tmdb_name': genre.get('name')
                                                         })
        movie_genre_obj, created = MovieGenre.objects.get_or_create(genre=genre_obj, movie=movie)
        new_movie_genres.append(movie_genre_obj)

    for existing_movie_genre in existing_movie_genres:
        if existing_movie_genre not in new_movie_genres:
            movie_genres_to_delete_ids.append(existing_movie_genre.id)

    MovieGenre.objects.filter(id__in=movie_genres_to_delete_ids).delete()


def get_movie_search_results(query, page):
    key = f'tmdb_movie_search_{query.replace(" ", "_")}_page_{page}'
    results = cache.get(key, None)
    if results is None:
        results = tmdb.Search().movie(query=query, page=page, language=LANGUAGE)
        cache.set(key, results, CACHE_TIMEOUT)
    return results


def get_tmdb_movie(tmdb_id):
    returned_from_cache = True
    key = get_tmdb_movie_key(tmdb_id)
    tmdb_movie = cache.get(key, None)
    if tmdb_movie is None:
        tmdb_movie = tmdb.Movies(tmdb_id).info(language=LANGUAGE)
        cache.set(key, tmdb_movie, CACHE_TIMEOUT)
        returned_from_cache = False
    return tmdb_movie, returned_from_cache


def get_tmdb_movie_videos(tmdb_id):
    key = f'movie_{tmdb_id}_videos'
    tmdb_movie_videos = cache.get(key, None)
    if tmdb_movie_videos is None:
        tmdb_movie_videos = tmdb.Movies(tmdb_id).videos(language=LANGUAGE)['results']
        tmdb_movie_videos = [x for x in tmdb_movie_videos if x['site'] == 'YouTube']
        for index, video in enumerate(tmdb_movie_videos):
            tmdb_movie_videos[index] = {
                'name': video['name'],
                'url': YOUTUBE_PREFIX + video['key']
            }
        cache.set(key, tmdb_movie_videos, CACHE_TIMEOUT)
    return tmdb_movie_videos


def get_cast_crew(tmdb_id):
    key = f'movie_{tmdb_id}_cast_crew'
    tmdb_cast_crew = cache.get(key, None)
    if tmdb_cast_crew is None:
        tmdb_cast_crew = tmdb.Movies(tmdb_id).credits(language=LANGUAGE)
        cache.set(key, tmdb_cast_crew, CACHE_TIMEOUT)
    return tmdb_cast_crew


def parse_movie(tmdb_movie, scheme):
    directors = []
    for i in tmdb_movie['crew']:
        if i['job'] == 'Director':
            directors.append(i)

    new_movie = {
        'id': tmdb_movie.get('id'),
        'name': tmdb_movie.get('title'),
        'original_name': tmdb_movie.get('original_title'),
        'overview': tmdb_movie.get('overview'),
        'runtime': tmdb_movie.get('runtime'),
        'release_date': '.'.join(reversed(tmdb_movie['release_date'].split('-')))
        if tmdb_movie.get('air_date') != "" else None,
        'score': int(tmdb_movie['vote_average'] * 10) if tmdb_movie.get('vote_average') else None,
        'tagline': tmdb_movie.get('tagline'),
        'backdrop_path': get_proxy_url(scheme, TMDB_BACKDROP_PATH_PREFIX, tmdb_movie.get('backdrop_path')),
        'poster_path': get_proxy_url(scheme, TMDB_POSTER_PATH_PREFIX, tmdb_movie.get('poster_path')),
        'genres': objects_to_str(tmdb_movie['genres']),
        'production_companies': objects_to_str(tmdb_movie['production_companies']),
        'cast': objects_to_str(tmdb_movie['cast'][:5]),
        'directors': objects_to_str(directors),
        'videos': tmdb_movie.get('videos')
    }

    return new_movie
