from adrf import mixins
from adrf.viewsets import GenericViewSet
from asgiref.sync import sync_to_async
from django.utils import timezone
from utils.swagger import openapi, swagger_auto_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from games.models import Game, UserGame
from games.selectors import (
    attach_games_user_status,
    get_database_search_results,
    get_game_social_payload,
)
from games.serializers import FollowedUserGameSerializer, GameSerializer, UserGameSerializer
from games.services.catalog import (
    GameNotFoundError as CatalogGameNotFoundError,
    IgdbUnavailableError,
    InvalidSearchFilterError,
    get_game_prices,
    get_igdb_platforms,
    get_or_sync_game,
    search_igdb_games,
)
from games.services.hltb_service import get_hltb_payload
from games.services.parser_service import parse_game_from_db
from games.services.refresh_service import GAME_DETAILS_REFRESH_INTERVAL, enqueue_game_refresh
from games.services.tracking import (
    GameNotFoundError as TrackingGameNotFoundError,
    update_user_game,
)
from utils.constants import (
    DEFAULT_PAGE_NUMBER,
    DEFAULT_PAGE_SIZE,
    ERROR,
    GAME_NOT_FOUND,
    IGDB_UNAVAILABLE,
)
from utils.functions import get_page_size


class SearchGamesViewSet(GenericViewSet, mixins.ListModelMixin):
    serializer_class = GameSerializer
    queryset = Game.objects.all()

    @swagger_auto_schema(
        operation_description="Search for games using IGDB API with pagination.",
        manual_parameters=[
            openapi.Parameter('query', openapi.IN_QUERY, type=openapi.TYPE_STRING),
            openapi.Parameter('page', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, default=DEFAULT_PAGE_NUMBER),
            openapi.Parameter('page_size', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, default=DEFAULT_PAGE_SIZE),
            openapi.Parameter('game_types', openapi.IN_QUERY, type=openapi.TYPE_STRING),
            openapi.Parameter('platforms', openapi.IN_QUERY, type=openapi.TYPE_STRING),
        ],
        responses={
            200: openapi.Response('OK'),
            503: openapi.Response('Service Unavailable'),
        }
    )
    @action(detail=False, methods=['get'])
    async def igdb(self, request):
        try:
            results = await sync_to_async(search_igdb_games)(
                request.GET.get('query', ''),
                request.GET.get('page', DEFAULT_PAGE_NUMBER),
                get_page_size(request.GET.get('page_size', DEFAULT_PAGE_SIZE)),
                request.GET.get('game_types'),
                request.GET.get('platforms'),
            )
        except InvalidSearchFilterError as error:
            return Response({ERROR: str(error)}, status=status.HTTP_400_BAD_REQUEST)
        except IgdbUnavailableError:
            return Response(IGDB_UNAVAILABLE, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        await sync_to_async(attach_games_user_status)(
            request.user,
            results.get('results') or [],
        )
        return Response(results)

    @swagger_auto_schema(
        operation_description="List platforms available in IGDB.",
        responses={
            200: openapi.Response('OK'),
            503: openapi.Response('Service Unavailable'),
        }
    )
    @action(detail=False, methods=['get'])
    def platforms(self, request):
        try:
            platforms = get_igdb_platforms()
        except IgdbUnavailableError:
            return Response(IGDB_UNAVAILABLE, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(platforms)

    @swagger_auto_schema(
        operation_description="List all games that match a search query, with pagination.",
        manual_parameters=[
            openapi.Parameter('query', openapi.IN_QUERY, type=openapi.TYPE_STRING),
            openapi.Parameter('page', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, default=DEFAULT_PAGE_NUMBER),
            openapi.Parameter('page_size', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, default=DEFAULT_PAGE_SIZE),
        ],
        responses={200: openapi.Response('OK')}
    )
    def list(self, request, *args, **kwargs):
        results = get_database_search_results(
            request.user,
            (request.GET.get('query', '') or '').strip(),
            request.GET.get('page', DEFAULT_PAGE_NUMBER),
            get_page_size(request.GET.get('page_size', DEFAULT_PAGE_SIZE)),
        )
        return Response(results)


class GameViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    queryset = UserGame.objects.all()
    serializer_class = UserGameSerializer
    lookup_field = 'slug'

    @swagger_auto_schema(
        operation_description="Retrieve details for a specific game by its slug.",
        manual_parameters=[
            openapi.Parameter('slug', openapi.IN_PATH, type=openapi.TYPE_STRING),
        ],
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Game Not Found'),
            503: openapi.Response('Service Unavailable'),
        }
    )
    async def retrieve(self, request, *args, **kwargs):
        try:
            game = await get_or_sync_game(kwargs.get('slug'))
        except CatalogGameNotFoundError:
            return Response({ERROR: GAME_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        except IgdbUnavailableError:
            return Response({ERROR: IGDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        response = Response(await parse_game_from_db(game))
        if game.igdb_last_update \
                and game.igdb_last_update <= timezone.now() - GAME_DETAILS_REFRESH_INTERVAL:
            await sync_to_async(enqueue_game_refresh)(
                game.igdb_slug,
                game.igdb_id,
                int(game.igdb_last_update.timestamp()),
            )
        return response

    @swagger_auto_schema(
        operation_description="Retrieve external store prices for a specific game by its slug.",
        manual_parameters=[
            openapi.Parameter('slug', openapi.IN_PATH, type=openapi.TYPE_STRING),
        ],
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Game Not Found'),
        }
    )
    @action(detail=True, methods=['get'])
    async def prices(self, request, *args, **kwargs):
        try:
            payload = await get_game_prices(kwargs.get('slug'), request.user)
        except CatalogGameNotFoundError:
            return Response({ERROR: GAME_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        return Response(payload)

    @swagger_auto_schema(
        operation_description="Retrieve HLTB data for a specific game by its slug.",
        manual_parameters=[
            openapi.Parameter('slug', openapi.IN_PATH, type=openapi.TYPE_STRING),
        ],
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Game Not Found'),
        }
    )
    @action(detail=True, methods=['get'])
    async def hltb(self, request, *args, **kwargs):
        try:
            payload = await get_hltb_payload(kwargs.get('slug'))
        except CatalogGameNotFoundError:
            return Response({ERROR: GAME_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        except IgdbUnavailableError:
            return Response({ERROR: IGDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(payload)

    @swagger_auto_schema(responses={status.HTTP_200_OK: FollowedUserGameSerializer(many=True)})
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    async def user_info(self, request, **kwargs):
        return Response(await get_game_social_payload(kwargs.get('slug'), request.user))

    @swagger_auto_schema(
        operation_description="Update the user's game status or information for a specific game.",
        manual_parameters=[
            openapi.Parameter('slug', openapi.IN_PATH, type=openapi.TYPE_STRING),
        ],
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'status': openapi.Schema(type=openapi.TYPE_STRING,
                                         enum=[UserGame.STATUS_PLAYING, UserGame.STATUS_COMPLETED,
                                               UserGame.STATUS_STOPPED, UserGame.STATUS_GOING,
                                               UserGame.STATUS_NOT_PLAYED]),
                'playtime': openapi.Schema(type=openapi.TYPE_NUMBER),
                'score': openapi.Schema(type=openapi.TYPE_INTEGER),
                'review': openapi.Schema(type=openapi.TYPE_STRING),
            },
        ),
        responses={
            200: 'OK',
            404: 'Game Not Found',
            400: 'Bad Request',
        }
    )
    async def update(self, request, **kwargs):
        try:
            response_data = await update_user_game(
                request.user,
                kwargs.get('slug'),
                request.data,
            )
        except TrackingGameNotFoundError:
            return Response({ERROR: GAME_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        return Response(response_data, status=status.HTTP_200_OK)
