from json import JSONDecodeError

from adrf import mixins
from adrf.viewsets import GenericViewSet
from asgiref.sync import sync_to_async
from django.contrib.postgres.search import TrigramSimilarity
from django.core.paginator import Paginator
from django.db import IntegrityError
from django.utils import timezone
from utils.swagger import openapi, swagger_auto_schema
from requests.exceptions import ConnectionError
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from games.functions import get_game_new_fields, get_rawg_game_trailers, get_rawg_game_screenshots
from games.integrations.hltb import get_game_release_year, get_hltb_game
from games.integrations.rawg import (
    get_game_search_results,
    get_rawg_count,
    get_rawg_game,
    update_game_developers,
    update_game_genres,
    update_game_screenshots,
    update_game_stores,
    update_game_trailers,
)
from games.models import Game, UserGame, GameTrailer, GameScreenshot
from games.services.parser_service import parse_game_from_db
from games.services.refresh_service import GAME_DETAILS_REFRESH_INTERVAL, enqueue_game_refresh
from games.serializers import UserGameSerializer, FollowedUserGameSerializer, GameSerializer
from users.models import UserFollow
from utils.constants import RAWG_UNAVAILABLE, ERROR, DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE, GAME_NOT_FOUND
from utils.functions import get_page_size, update_fields_if_needed_async


class SearchGamesViewSet(GenericViewSet, mixins.ListModelMixin):
    serializer_class = GameSerializer
    queryset = Game.objects.all()

    @swagger_auto_schema(
        operation_description="Search for games using RAWG API with pagination.",
        manual_parameters=[
            openapi.Parameter('query', openapi.IN_QUERY, type=openapi.TYPE_STRING),
            openapi.Parameter('page', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, default=DEFAULT_PAGE_NUMBER),
            openapi.Parameter('page_size', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, default=DEFAULT_PAGE_SIZE),
        ],
        responses={
            200: openapi.Response('OK'),
            503: openapi.Response('Service Unavailable'),
        }
    )
    @action(detail=False, methods=['get'])
    async def rawg(self, request):
        query = request.GET.get('query', '')
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)
        page_size = get_page_size(request.GET.get('page_size', DEFAULT_PAGE_SIZE))

        try:
            results = get_game_search_results(query, page, page_size)
        except JSONDecodeError:
            return Response(RAWG_UNAVAILABLE, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(results)

    @swagger_auto_schema(
        operation_description="List all games that match a search query, with pagination.",
        manual_parameters=[
            openapi.Parameter('query', openapi.IN_QUERY, type=openapi.TYPE_STRING),
            openapi.Parameter('page', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, default=DEFAULT_PAGE_NUMBER),
            openapi.Parameter('page_size', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, default=DEFAULT_PAGE_SIZE),
        ],
        responses={
            200: openapi.Response('OK')
        }
    )
    def list(self, request, *args, **kwargs):
        query = request.GET.get('query', '')
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)
        page_size = get_page_size(request.GET.get('page_size', DEFAULT_PAGE_SIZE))

        games = Game.objects.annotate(similarity=TrigramSimilarity('rawg_name', query)) \
            .filter(similarity__gt=0.1) \
            .order_by('-similarity')
        paginator = Paginator(games, page_size)
        paginator_page = paginator.get_page(page)
        serializer = GameSerializer(paginator_page.object_list, many=True)

        return Response(serializer.data)


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
        slug = kwargs.get('slug')
        game = await Game.objects.filter(rawg_slug=slug).afirst()
        game_by_requested_slug = game
        should_fetch_from_rawg = (
            game is None
            or game.rawg_last_update is None
            or game.rawg_movies_count is None
            or game.rawg_screenshots_count is None
        )

        if should_fetch_from_rawg:
            try:
                rawg_game, _ = get_rawg_game(slug)
            except KeyError:
                return Response({ERROR: GAME_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            except (ConnectionError, ValueError, JSONDecodeError):
                return Response({ERROR: RAWG_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            new_fields = get_game_new_fields(rawg_game)

            try:
                game, created = await Game.objects.filter().aget_or_create(
                    rawg_id=rawg_game.get('id'),
                    defaults=new_fields
                )
            except IntegrityError:
                created = False
                game = await Game.objects.filter().aget(rawg_slug=rawg_game.get('slug'))

            # If DB already contains duplicate legacy rows for the same RAWG game,
            # prefer the row addressed by requested slug for this response/update path.
            if game_by_requested_slug is not None and game.pk != game_by_requested_slug.pk:
                game = game_by_requested_slug
                created = False

            if not created:
                # Even cached RAWG payload is enough to fill missing legacy fields in DB.
                fields_to_update = dict(new_fields)

                new_slug = fields_to_update.get('rawg_slug')
                if new_slug:
                    slug_conflict = await Game.objects.filter(rawg_slug=new_slug).exclude(pk=game.pk).afirst()
                    if slug_conflict is not None:
                        fields_to_update.pop('rawg_slug', None)

                new_rawg_id = fields_to_update.get('rawg_id')
                if new_rawg_id is not None:
                    rawg_id_conflict = await Game.objects.filter(rawg_id=new_rawg_id).exclude(pk=game.pk).afirst()
                    if rawg_id_conflict is not None:
                        fields_to_update.pop('rawg_id', None)

                await update_fields_if_needed_async(game, fields_to_update)

            await update_game_genres(game, rawg_game)
            await update_game_developers(game, rawg_game)
            await update_game_stores(game, rawg_game)

            expected_movies_count = get_rawg_count(rawg_game.get('movies_count'))
            expected_screenshots_count = get_rawg_count(rawg_game.get('screenshots_count'))
            rawg_slug = rawg_game.get('slug') or slug

            if expected_movies_count is not None:
                trailers_db_count = await GameTrailer.objects.filter(game=game).acount()
                if trailers_db_count != expected_movies_count:
                    try:
                        rawg_trailers = get_rawg_game_trailers(rawg_slug)
                    except (ConnectionError, ValueError, JSONDecodeError, TypeError):
                        rawg_trailers = None
                    if rawg_trailers is not None:
                        await update_game_trailers(game, rawg_trailers)

            if expected_screenshots_count is not None:
                screenshots_db_count = await GameScreenshot.objects.filter(game=game).acount()
                if screenshots_db_count != expected_screenshots_count:
                    try:
                        rawg_screenshots = get_rawg_game_screenshots(rawg_slug)
                    except (ConnectionError, ValueError, JSONDecodeError, TypeError):
                        rawg_screenshots = None
                    if rawg_screenshots is not None:
                        await update_game_screenshots(game, rawg_screenshots)

        parsed_game = await parse_game_from_db(game)
        response = Response(parsed_game)

        if game.rawg_last_update and game.rawg_last_update <= timezone.now() - GAME_DETAILS_REFRESH_INTERVAL:
            game_slug = game.rawg_slug
            response.add_post_render_callback(lambda _: enqueue_game_refresh(game_slug))

        return response

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
        slug = kwargs.get('slug')
        game = await Game.objects.filter(rawg_slug=slug).afirst()
        if game is None:
            try:
                rawg_game, _ = get_rawg_game(slug)
            except KeyError:
                return Response({ERROR: GAME_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
            except (ConnectionError, ValueError, JSONDecodeError):
                return Response({ERROR: RAWG_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            new_fields = get_game_new_fields(rawg_game)
            try:
                game, created = await Game.objects.filter().aget_or_create(
                    rawg_id=rawg_game.get('id'),
                    defaults=new_fields,
                )
            except IntegrityError:
                created = False
                game = await Game.objects.filter().aget(rawg_slug=rawg_game.get('slug'))

            if not created:
                await update_fields_if_needed_async(game, new_fields)

            await update_game_genres(game, rawg_game)
            await update_game_developers(game, rawg_game)
            await update_game_stores(game, rawg_game)

        release_year = get_game_release_year(game.rawg_release_date)
        hltb_game = get_hltb_game(game.rawg_name, release_year)
        if hltb_game is not None:
            hltb_name = hltb_game.get('game_name')
            hltb_id = hltb_game.get('game_id')
            await update_fields_if_needed_async(game, {'hltb_name': hltb_name, 'hltb_id': hltb_id})
            return Response(hltb_game)
        else:
            return Response({ERROR: GAME_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

    @swagger_auto_schema(responses={status.HTTP_200_OK: FollowedUserGameSerializer(many=True)})
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    async def user_info(self, request, **kwargs):
        try:
            game = await Game.objects.aget(rawg_slug=kwargs.get('slug'))

            try:
                user_game = await UserGame.objects.exclude(status=UserGame.STATUS_NOT_PLAYED).aget(user=request.user,
                                                                                                   game=game)
                user_info = await self.get_serializer(user_game).adata
            except UserGame.DoesNotExist:
                user_info = None

            user_follow_query = UserFollow.objects.filter(user=request.user, is_following=True).values('followed_user')
            followed_user_games = UserGame.objects.select_related('user').filter(user__in=user_follow_query, game=game) \
                .exclude(status=UserGame.STATUS_NOT_PLAYED)
            serializer = FollowedUserGameSerializer(followed_user_games, many=True)
            friends_info = await serializer.adata
        except Game.DoesNotExist:
            user_info = None
            friends_info = ()

        return Response({'user_info': user_info, 'friends_info': friends_info})

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
            game = await Game.objects.aget(rawg_slug=kwargs.get('slug'))
        except Game.DoesNotExist:
            return Response({ERROR: GAME_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()

        if 'playtime' in data and 'spent_time' not in data:
            data['spent_time'] = data.pop('playtime')

        data.update({'user': request.user.pk,
                     'game': game.pk})

        try:
            user_game = await UserGame.objects.aget(user=request.user, game=game)
            serializer = self.get_serializer(user_game, data=data)
        except UserGame.DoesNotExist:
            serializer = self.get_serializer(data=data)

        # todo: rework
        await sync_to_async(serializer.is_valid)(raise_exception=True)
        await sync_to_async(serializer.save)()
        data = await serializer.adata

        return Response(data, status=status.HTTP_200_OK)
