from utils.swagger import openapi, swagger_auto_schema
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from movies.models import UserMovie
from movies.selectors import (
    get_movie_payload,
    get_movie_social_payload,
    get_recommendations_payload,
)
from movies.serializers import FollowedUserMovieSerializer, UserMovieReadSerializer
from movies.services.catalog import (
    MovieNotFoundError as CatalogMovieNotFoundError,
    TmdbUnavailableError,
    enqueue_movie_refresh,
    get_movie_recommendations,
    get_movie_trailers,
    get_movie_for_detail,
    movie_refresh_is_due,
)
from movies.services.tracking import (
    MovieNotFoundError as TrackingMovieNotFoundError,
    update_user_movie,
)
from utils.constants import ERROR, MOVIE_NOT_FOUND, TMDB_UNAVAILABLE


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
        try:
            movie, needs_refresh = get_movie_for_detail(kwargs.get('tmdb_id'))
        except CatalogMovieNotFoundError:
            return Response({ERROR: MOVIE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        except TmdbUnavailableError:
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        response = Response(get_movie_payload(movie, request))
        if needs_refresh or movie_refresh_is_due(movie):
            movie_id = movie.tmdb_id
            response.add_post_render_callback(lambda _: enqueue_movie_refresh(movie_id))
        return response

    @swagger_auto_schema(
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Movie not found'),
            503: openapi.Response('TMDB unavailable'),
        }
    )
    @action(detail=True, methods=['get'])
    def trailers(self, request, *args, **kwargs):
        try:
            trailers = get_movie_trailers(kwargs.get('tmdb_id'))
        except CatalogMovieNotFoundError:
            return Response({ERROR: MOVIE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        except TmdbUnavailableError:
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(trailers)

    @swagger_auto_schema(responses={status.HTTP_200_OK: FollowedUserMovieSerializer(many=True)})
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def user_info(self, request, *args, **kwargs):
        return Response(get_movie_social_payload(
            kwargs.get('tmdb_id'),
            request.user,
            request,
        ))

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
        try:
            page = int(request.query_params.get('page', 1) or 1)
        except (TypeError, ValueError):
            page = 1
        page = max(page, 1)

        try:
            payload = get_movie_recommendations(kwargs.get('tmdb_id'), page)
        except CatalogMovieNotFoundError:
            return Response({ERROR: MOVIE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        except TmdbUnavailableError:
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(get_recommendations_payload(payload, page, request))

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
            response_data = update_user_movie(
                request.user,
                kwargs.get('tmdb_id'),
                request.data,
            )
        except TrackingMovieNotFoundError:
            return Response({ERROR: MOVIE_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        return Response(response_data, status=status.HTTP_200_OK)
