import tmdbsimple as tmdb
from django.core.paginator import Paginator
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from requests import HTTPError
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from movies.models import Movie, UserMovie
from movies.serializers import UserMovieSerializer, FollowedUserMovieSerializer
from users.models import UserFollow
from utils.constants import LANGUAGE, ERROR, MOVIE_NOT_FOUND, TMDB_UNAVAILABLE
from utils.documentation import FRIENDS_INFO_200_EXAMPLE, MOVIES_SEARCH_200_EXAMPLE, MOVIE_RETRIEVE_200_EXAMPLE
from utils.functions import get_page_size
from utils.openapi_params import query_param, page_param, DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE, page_size_param


class SearchMoviesViewSet(GenericViewSet, mixins.ListModelMixin):
    @swagger_auto_schema(manual_parameters=[query_param, page_param],
                         responses={
                             status.HTTP_200_OK: openapi.Response(
                                 description=status.HTTP_200_OK,
                                 examples={
                                     "application/json": MOVIES_SEARCH_200_EXAMPLE
                                 }

                             )
                         })
    def list(self, request, *args, **kwargs):
        query = request.GET.get('query', '')
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)
        try:
            results = tmdb.Search().movie(query=query, page=page, language=LANGUAGE)
        except HTTPError:
            results = None
        return Response(results, status=status.HTTP_200_OK)


class MovieViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    queryset = UserMovie.objects.all()
    serializer_class = UserMovieSerializer
    lookup_field = 'tmdb_id'

    @swagger_auto_schema(responses={
        status.HTTP_200_OK: openapi.Response(
            description=status.HTTP_200_OK,
            examples={
                "application/json": MOVIE_RETRIEVE_200_EXAMPLE
            }
        ),
        status.HTTP_404_NOT_FOUND: openapi.Response(
            description=status.HTTP_404_NOT_FOUND,
            examples={
                "application/json": {
                    ERROR: MOVIE_NOT_FOUND
                }
            }
        ),
        status.HTTP_503_SERVICE_UNAVAILABLE: openapi.Response(
            description=status.HTTP_503_SERVICE_UNAVAILABLE,
            examples={
                "application/json": {
                    ERROR: TMDB_UNAVAILABLE
                },
            }
        )
    })
    def retrieve(self, request, *args, **kwargs):
        try:
            tmdb_movie = tmdb.Movies(kwargs.get('tmdb_id')).info(language=LANGUAGE)
            tmdb_cast_crew = tmdb.Movies(kwargs.get('tmdb_id')).credits(language=LANGUAGE)
            tmdb_movie['cast'] = tmdb_cast_crew.get('cast')
            tmdb_movie['crew'] = tmdb_cast_crew.get('crew')
        except HTTPError as e:
            error_code = int(e.args[0].split(' ', 1)[0])
            if error_code == 404:
                return Response({ERROR: MOVIE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except ConnectionError:
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            movie = Movie.objects.get(tmdb_id=tmdb_movie['id'])
            user_movie = UserMovie.objects.exclude(status=UserMovie.STATUS_NOT_WATCHED).get(user=request.user,
                                                                                            movie=movie)
            user_info = self.get_serializer(user_movie).data
        except (Movie.DoesNotExist, UserMovie.DoesNotExist):
            user_info = None

        return Response({'tmdb': tmdb_movie, 'user_info': user_info})

    @swagger_auto_schema(manual_parameters=[page_param, page_size_param],
                         responses=FRIENDS_INFO_200_EXAMPLE)
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def friends_info(self, request, *args, **kwargs):
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)
        page_size = get_page_size(request.GET.get('page_size', DEFAULT_PAGE_SIZE))

        try:
            movie = Movie.objects.get(tmdb_id=kwargs.get('tmdb_id'))
            user_follow_query = UserFollow.objects.filter(user=request.user)
            friends_info = []
            for user_follow in user_follow_query:
                followed_user_movie = UserMovie.objects.filter(user=user_follow.followed_user, movie=movie).first()
                if followed_user_movie:
                    serializer = FollowedUserMovieSerializer(followed_user_movie)
                    friends_info.append(serializer.data)

        except Movie.DoesNotExist:
            friends_info = []

        paginator = Paginator(friends_info, page_size)
        paginator_page = paginator.get_page(page)

        return Response({'friends_info': paginator_page.object_list,
                         'has_next_page': paginator_page.has_next()})

    @swagger_auto_schema(request_body=openapi.Schema(
        type=openapi.TYPE_OBJECT,
        properties={
            "status": openapi.Schema(
                type=openapi.TYPE_STRING,
                enum=list(dict(UserMovie.STATUS_CHOICES).keys()) + list(dict(UserMovie.STATUS_CHOICES).values())
            ),
            "score": openapi.Schema(
                type=openapi.TYPE_INTEGER,
                minimum=UserMovie._meta.get_field('score').validators[0].limit_value,
                maximum=UserMovie._meta.get_field('score').validators[1].limit_value
            ),
            "review": openapi.Schema(
                type=openapi.TYPE_STRING,
                maxLength=UserMovie._meta.get_field('review').max_length
            )
        }
    ),
        responses={
            status.HTTP_404_NOT_FOUND: openapi.Response(
                description=status.HTTP_404_NOT_FOUND,
                examples={
                    "application/json": {
                        ERROR: MOVIE_NOT_FOUND
                    }
                }
            ),
            status.HTTP_503_SERVICE_UNAVAILABLE: openapi.Response(
                description=status.HTTP_503_SERVICE_UNAVAILABLE,
                examples={
                    "application/json": {
                        ERROR: TMDB_UNAVAILABLE
                    },
                }
            )
        }
    )
    def update(self, request, *args, **kwargs):
        try:
            movie = Movie.objects.get(tmdb_id=kwargs.get('tmdb_id'))
        except Movie.DoesNotExist:
            try:
                tmdb_movie = tmdb.Movies(kwargs.get('tmdb_id')).info(language=LANGUAGE)
            except HTTPError as e:
                error_code = int(e.args[0].split(' ', 1)[0])
                if error_code == 404:
                    return Response({ERROR: MOVIE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
                return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            movie = Movie.objects.create(imdb_id=tmdb_movie.get('imdb_id'), tmdb_id=tmdb_movie.get('id'),
                                         tmdb_original_name=tmdb_movie.get('original_title'),
                                         tmdb_name=tmdb_movie.get('title'), tmdb_runtime=tmdb_movie.get('runtime'))

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
