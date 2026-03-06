from adrf import mixins
from adrf.viewsets import GenericViewSet
from asgiref.sync import sync_to_async
from datetime import timedelta
from django.contrib.postgres.search import TrigramSimilarity
from django.db.models import F, Q, Value
from django.db.models.functions import Coalesce, Greatest, NullIf
from django.core.paginator import Paginator
from django.utils import timezone
from utils.swagger import openapi, swagger_auto_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from games.integrations.hltb import (
    build_hltb_response_from_hours,
    extract_hltb_hours_map,
    get_game_release_year,
    get_hltb_game,
)
from games.integrations.igdb import (
    get_game_search_results,
    get_igdb_game_new_fields,
    query_igdb_game_by_slug,
    resolve_igdb_game_details,
    update_game_beat_times_from_igdb,
    update_game_developers_from_igdb,
    update_game_genres_from_igdb,
    update_game_media_from_igdb,
    update_game_stores_from_igdb,
)
from games.models import Game, GameBeatTime, UserGame
from games.services.parser_service import parse_game_from_db
from games.services.refresh_service import GAME_DETAILS_REFRESH_INTERVAL, enqueue_game_refresh
from games.tasks import refresh_hltb_beat_times_by_game_id
from games.serializers import UserGameSerializer, FollowedUserGameSerializer, GameSerializer
from users.models import UserFollow
from utils.constants import IGDB_UNAVAILABLE, ERROR, DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE, GAME_NOT_FOUND
from utils.functions import get_page_size, update_fields_if_needed_async


class SearchGamesViewSet(GenericViewSet, mixins.ListModelMixin):
    serializer_class = GameSerializer
    queryset = Game.objects.all()

    @swagger_auto_schema(
        operation_description="Search for games using IGDB API with pagination.",
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
    async def igdb(self, request):
        query = request.GET.get('query', '')
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)
        page_size = get_page_size(request.GET.get('page_size', DEFAULT_PAGE_SIZE))

        try:
            results = get_game_search_results(query, page, page_size)
        except Exception:
            return Response(IGDB_UNAVAILABLE, status=status.HTTP_503_SERVICE_UNAVAILABLE)

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
        query = (request.GET.get('query', '') or '').strip()
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)
        page_size = get_page_size(request.GET.get('page_size', DEFAULT_PAGE_SIZE))

        if not query:
            return Response([])

        games = (
            Game.objects
            .annotate(
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
            )
            .annotate(
                similarity_name=TrigramSimilarity('search_name', query),
                similarity_slug=TrigramSimilarity('search_slug', query),
            )
            .annotate(similarity=Greatest('similarity_name', 'similarity_slug'))
            .filter(
                Q(search_name__icontains=query)
                | Q(search_slug__icontains=query)
                | Q(similarity__gt=0.1)
            )
            .order_by('-similarity')
        )
        paginator = Paginator(games, page_size)
        paginator_page = paginator.get_page(page)
        serializer = GameSerializer(paginator_page.object_list, many=True)

        return Response(serializer.data)


class GameViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    queryset = UserGame.objects.all()
    serializer_class = UserGameSerializer
    lookup_field = 'slug'
    HLTB_REFRESH_INTERVAL = timedelta(days=7)

    @staticmethod
    async def _get_game_by_public_slug(slug):
        return await Game.objects.filter(igdb_slug=slug).afirst()

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
        game = await self._get_game_by_public_slug(slug)
        if game is None:
            try:
                igdb_game = query_igdb_game_by_slug(slug)
            except Exception:
                return Response({ERROR: IGDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            if not igdb_game:
                return Response({ERROR: GAME_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

            defaults = {}
            defaults.update(get_igdb_game_new_fields(igdb_game))
            game = await self._get_game_by_public_slug(slug)
            if game is None:
                game = await Game.objects.acreate(**defaults)
            else:
                await update_fields_if_needed_async(game, defaults)
            await update_game_genres_from_igdb(game, igdb_game)
            await update_game_developers_from_igdb(game, igdb_game)
            await update_game_beat_times_from_igdb(game, igdb_game)
            await update_game_media_from_igdb(game, igdb_game)
            await update_game_stores_from_igdb(game, igdb_game)

        has_igdb_beat_times = await GameBeatTime.objects.filter(
            game=game,
            source=GameBeatTime.SOURCE_IGDB,
        ).aexists()

        should_fetch_from_igdb = (
            game.igdb_last_update is None
            or game.igdb_videos_count is None
            or game.igdb_screenshots_count is None
            or not game.igdb_name
            or not has_igdb_beat_times
        )

        if should_fetch_from_igdb:
            try:
                igdb_game = resolve_igdb_game_details(game, slug)
            except Exception:
                igdb_game = None

            if igdb_game is not None:
                fields_to_update = {}
                fields_to_update.update(get_igdb_game_new_fields(igdb_game))
                await update_fields_if_needed_async(game, fields_to_update)
                await update_game_genres_from_igdb(game, igdb_game)
                await update_game_developers_from_igdb(game, igdb_game)
                await update_game_beat_times_from_igdb(game, igdb_game)
                await update_game_media_from_igdb(game, igdb_game)
                await update_game_stores_from_igdb(game, igdb_game)
            elif game.igdb_last_update is None:
                return Response({ERROR: IGDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        parsed_game = await parse_game_from_db(game)
        response = Response(parsed_game)

        if game.igdb_last_update and game.igdb_last_update <= timezone.now() - GAME_DETAILS_REFRESH_INTERVAL:
            game_slug = game.igdb_slug
            game_igdb_id = game.igdb_id
            refresh_version = int(game.igdb_last_update.timestamp())
            enqueue_game_refresh(game_slug, game_igdb_id, refresh_version)

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
        game = await self._get_game_by_public_slug(slug)
        if game is None:
            try:
                igdb_game = query_igdb_game_by_slug(slug)
            except Exception:
                return Response({ERROR: IGDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            if not igdb_game:
                return Response({ERROR: GAME_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

            defaults = {}
            defaults.update(get_igdb_game_new_fields(igdb_game))
            game = await self._get_game_by_public_slug(slug)
            if game is None:
                game = await Game.objects.acreate(**defaults)
            else:
                await update_fields_if_needed_async(game, defaults)
            await update_game_genres_from_igdb(game, igdb_game)
            await update_game_developers_from_igdb(game, igdb_game)
            await update_game_beat_times_from_igdb(game, igdb_game)
            await update_game_stores_from_igdb(game, igdb_game)

        hltb_entries = []
        igdb_entries = []
        entries_qs = GameBeatTime.objects.filter(game=game)
        async for entry in entries_qs:
            if entry.source == GameBeatTime.SOURCE_HLTB:
                hltb_entries.append(entry)
            elif entry.source == GameBeatTime.SOURCE_IGDB:
                igdb_entries.append(entry)

        if hltb_entries or igdb_entries:
            preferred_source = GameBeatTime.SOURCE_HLTB if hltb_entries else GameBeatTime.SOURCE_IGDB
            preferred_entries = hltb_entries if hltb_entries else igdb_entries

            hours_map = {}
            for entry in preferred_entries:
                if entry.type == GameBeatTime.TYPE_MAIN:
                    hours_map['main'] = entry.hours
                elif entry.type == GameBeatTime.TYPE_EXTRA:
                    hours_map['extra'] = entry.hours
                elif entry.type == GameBeatTime.TYPE_COMPLETE:
                    hours_map['complete'] = entry.hours

            if preferred_source == GameBeatTime.SOURCE_HLTB:
                last_update_values = [entry.last_update for entry in hltb_entries if entry.last_update]
                is_stale = (not last_update_values) or (
                    max(last_update_values) <= timezone.now() - self.HLTB_REFRESH_INTERVAL
                )
                if is_stale:
                    refresh_hltb_beat_times_by_game_id.delay(game.id)
            elif not hltb_entries:
                # We can show IGDB time immediately, and warm up HLTB if timing data is stale.
                last_update_values = [entry.last_update for entry in igdb_entries if entry.last_update]
                is_stale = (not last_update_values) or (
                    max(last_update_values) <= timezone.now() - self.HLTB_REFRESH_INTERVAL
                )
                if is_stale:
                    refresh_hltb_beat_times_by_game_id.delay(game.id)

            payload = build_hltb_response_from_hours(hours_map)
            payload['source'] = preferred_source
            return Response(payload)

        release_year = get_game_release_year(game.igdb_release_date)
        hltb_game = get_hltb_game(game.igdb_name, release_year)
        if hltb_game is not None:
            hltb_name = hltb_game.get('game_name')
            hltb_id = hltb_game.get('game_id')
            await update_fields_if_needed_async(game, {'hltb_name': hltb_name, 'hltb_id': hltb_id})
            hours_map = extract_hltb_hours_map(hltb_game)
            now = timezone.now()
            existing_entries = GameBeatTime.objects.filter(game=game, source=GameBeatTime.SOURCE_HLTB)
            upserted_ids = []
            for beat_type, hours_value in (
                (GameBeatTime.TYPE_MAIN, hours_map.get('main')),
                (GameBeatTime.TYPE_EXTRA, hours_map.get('extra')),
                (GameBeatTime.TYPE_COMPLETE, hours_map.get('complete')),
            ):
                if hours_value is None:
                    continue
                beat_time = await GameBeatTime.objects.filter(
                    game=game,
                    source=GameBeatTime.SOURCE_HLTB,
                    type=beat_type,
                ).afirst()
                if beat_time is None:
                    beat_time = await GameBeatTime.objects.acreate(
                        game=game,
                        source=GameBeatTime.SOURCE_HLTB,
                        type=beat_type,
                        hours=hours_value,
                        last_update=now,
                    )
                else:
                    await update_fields_if_needed_async(beat_time, {'hours': hours_value, 'last_update': now})
                upserted_ids.append(beat_time.id)

            if upserted_ids:
                await existing_entries.exclude(id__in=upserted_ids).adelete()
            else:
                await existing_entries.adelete()

            payload = build_hltb_response_from_hours(hours_map)
            payload['source'] = GameBeatTime.SOURCE_HLTB
            return Response(payload)
        else:
            return Response({ERROR: GAME_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

    @swagger_auto_schema(responses={status.HTTP_200_OK: FollowedUserGameSerializer(many=True)})
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    async def user_info(self, request, **kwargs):
        try:
            game = await self._get_game_by_public_slug(kwargs.get('slug'))
            if game is None:
                raise Game.DoesNotExist

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
            game = await self._get_game_by_public_slug(kwargs.get('slug'))
            if game is None:
                raise Game.DoesNotExist
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
