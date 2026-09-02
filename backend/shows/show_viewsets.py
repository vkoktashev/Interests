from utils.swagger import openapi, swagger_auto_schema
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from shows.models import UserShow
from shows.selectors import (
    get_recommendations_payload,
    get_show_payload,
    get_show_social_payload,
    get_unwatched_episodes_payload,
)
from shows.serializers import FollowedUserShowSerializer, UserShowReadSerializer
from shows.services.catalog import (
    ShowNotFoundError as CatalogShowNotFoundError,
    TmdbUnavailableError,
    enqueue_show_refresh,
    get_show_for_detail,
    get_show_recommendations,
    get_show_trailers,
    show_refresh_is_due,
)
from shows.services.tracking import (
    InvalidEpisodesError,
    ShowNotFoundError as TrackingShowNotFoundError,
    complete_show,
    update_user_episodes,
    update_user_show,
)
from shows.tasks import update_all_shows_task, update_shows
from utils.celery import enqueue_background_task_once
from utils.constants import ERROR, SHOW_NOT_FOUND, TMDB_UNAVAILABLE
from utils.functions import create_post_render_callback


class ShowViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    queryset = UserShow.objects.all()
    serializer_class = UserShowReadSerializer
    lookup_field = 'tmdb_id'

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('tmdb_id', openapi.IN_PATH, type=openapi.TYPE_INTEGER),
        ],
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Not Found'),
            503: openapi.Response('Service Unavailable'),
        }
    )
    def retrieve(self, request, *args, **kwargs):
        tmdb_id = kwargs.get('tmdb_id')
        try:
            show, needs_refresh = get_show_for_detail(tmdb_id)
        except CatalogShowNotFoundError:
            return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        except TmdbUnavailableError:
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        response = Response(get_show_payload(show, request))
        if needs_refresh or show_refresh_is_due(show):
            show_id = show.tmdb_id
            response.add_post_render_callback(create_post_render_callback(enqueue_show_refresh, show_id))

        return response

    @swagger_auto_schema(
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Show not found'),
            503: openapi.Response('TMDB unavailable'),
        }
    )
    @action(detail=True, methods=['get'])
    def trailers(self, request, *args, **kwargs):
        try:
            trailers = get_show_trailers(kwargs.get('tmdb_id'))
        except CatalogShowNotFoundError:
            return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        except TmdbUnavailableError:
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(trailers)

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('tmdb_id', openapi.IN_PATH, type=openapi.TYPE_INTEGER),
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'status': openapi.Schema(type=openapi.TYPE_STRING,
                                         enum=[UserShow.STATUS_WATCHED, UserShow.STATUS_STOPPED,
                                               UserShow.STATUS_GOING, UserShow.STATUS_NOT_WATCHED,
                                               UserShow.STATUS_WATCHING]),
                'score': openapi.Schema(type=openapi.TYPE_INTEGER),
                'review': openapi.Schema(type=openapi.TYPE_STRING),
            },
        ),
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Not Found'),
        }
    )
    def update(self, request, *args, **kwargs):
        try:
            response_data = update_user_show(
                request.user,
                kwargs.get('tmdb_id'),
                request.data,
            )
        except TrackingShowNotFoundError:
            return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        return Response(response_data, status=status.HTTP_200_OK)

    @swagger_auto_schema(responses={status.HTTP_200_OK: FollowedUserShowSerializer(many=True)})
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def user_info(self, request, *args, **kwargs):
        return Response(get_show_social_payload(
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
            404: openapi.Response('Show not found'),
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
            payload = get_show_recommendations(tmdb_id, page)
        except CatalogShowNotFoundError:
            return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        except TmdbUnavailableError:
            return Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(get_recommendations_payload(payload, page, request))

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('tmdb_id', openapi.IN_PATH, type=openapi.TYPE_INTEGER),
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_ARRAY,
            items=openapi.Schema(type=openapi.TYPE_OBJECT, properties={
                'tmdb_id': openapi.Schema(type=openapi.TYPE_INTEGER),
                'score': openapi.Schema(type=openapi.TYPE_INTEGER)
            })
        ),
        responses={
            200: openapi.Response('OK'),
            400: openapi.Response('Bad Request'),
            404: openapi.Response('Show Not Found'),
        }
    )
    @action(detail=True, methods=['put'])
    def episodes(self, request, *args, **kwargs):
        try:
            update_user_episodes(
                request.user,
                kwargs.get('tmdb_id'),
                request.data.get('episodes'),
            )
        except TrackingShowNotFoundError:
            return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        except InvalidEpisodesError:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_200_OK)

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('tmdb_id', openapi.IN_PATH, type=openapi.TYPE_INTEGER),
        ],
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Show Not Found'),
        }
    )
    @action(detail=True, methods=['put'])
    def complete(self, request, *args, **kwargs):
        try:
            complete_show(request.user, kwargs.get('tmdb_id'))
        except TrackingShowNotFoundError:
            return Response({ERROR: SHOW_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_200_OK)

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('page', openapi.IN_QUERY, type=openapi.TYPE_INTEGER,
                              description='Page number for pagination'),
            openapi.Parameter('page_size', openapi.IN_QUERY, type=openapi.TYPE_INTEGER,
                              description='Number of episodes per page'),
        ],
        responses={
            200: openapi.Response('OK'),
            401: openapi.Response('Unauthorized'),
        }
    )
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def unwatched_episodes(self, request):
        return Response(get_unwatched_episodes_payload(request.user, request))

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('start_index', openapi.IN_QUERY, type=openapi.TYPE_INTEGER,
                              description='Index to start the update from', default=0)
        ],
        responses={
            200: openapi.Response('OK')
        },
        operation_description="This operation is potentially dangerous and may take a long time."
    )
    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def update_all_shows(self, request):
        start_index = int(request.GET.get('start_index', 0))
        is_queued = enqueue_background_task_once(
            update_all_shows_task,
            identity=f'all:{start_index}',
            args=(start_index,),
            task_name='update_all_shows_task',
        )
        return Response({'queued': is_queued})

    @swagger_auto_schema(
        responses={
            200: openapi.Response('OK')
        },
        operation_description="This operation is potentially dangerous and may take a long time."
    )
    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def update_shows(self, request):
        is_queued = enqueue_background_task_once(
            update_shows,
            identity='scheduled',
            task_name='update_shows',
        )
        return Response({'queued': is_queued})
