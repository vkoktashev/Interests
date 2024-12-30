from json import JSONDecodeError
from typing import List

import rawgpy
from adrf import mixins
from adrf.viewsets import GenericViewSet
from asgiref.sync import sync_to_async
from django.contrib.postgres.search import TrigramSimilarity
from django.core.cache import cache
from django.core.exceptions import ObjectDoesNotExist
from django.core.paginator import Paginator
from django.db import IntegrityError
from drf_yasg.utils import swagger_auto_schema
from howlongtobeatpy import HowLongToBeat
from requests.exceptions import ConnectionError
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from games.functions import get_game_new_fields, get_hltb_game_key, get_rawg_game_key
from games.models import Game, UserGame, Genre, GameGenre, GameStore, Store
from games.serializers import UserGameSerializer, FollowedUserGameSerializer, GameSerializer
from users.models import UserFollow
from utils.constants import RAWG_UNAVAILABLE, ERROR, rawg, DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE, \
    GAME_NOT_FOUND, CACHE_TIMEOUT
from utils.functions import int_to_hours, get_page_size, update_fields_if_needed, \
    objects_to_str, float_to_hours, update_fields_if_needed_async


class SearchGamesViewSet(GenericViewSet, mixins.ListModelMixin):
    queryset = Game.objects.all()

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

    async def retrieve(self, request, *args, **kwargs):
        slug = kwargs.get('slug')

        try:
            rawg_game, returned_from_cache = get_rawg_game(slug)
        except KeyError:
            return Response({ERROR: GAME_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        except JSONDecodeError:
            return Response({ERROR: RAWG_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        new_fields = get_game_new_fields(rawg_game)

        try:
            game, created = await Game.objects.filter().aget_or_create(rawg_id=rawg_game.get('id'),
                                                                       defaults=new_fields)
        except IntegrityError:
            created = False
            game = await Game.objects.filter().aget(rawg_slug=rawg_game.get('slug'))
        if not created and not returned_from_cache:
            await update_fields_if_needed_async(game, new_fields)
        if created or not returned_from_cache:
            await update_game_genres(game, rawg_game)
            await update_game_stores(game, rawg_game)
        game_stores = GameStore.objects.filter(game=game).select_related('store')
        async for game_store in game_stores:
            for rawg_game_store in rawg_game.get('stores'):
                if game_store.store.rawg_id == rawg_game_store.get('store').get('id'):
                    rawg_game_store['url'] = game_store.url
                    break
        parsed_game = parse_game(rawg_game, None)
        return Response(parsed_game)

    @action(detail=True, methods=['get'])
    async def hltb(self, request, *args, **kwargs):
        slug = kwargs.get('slug')
        try:
            game = await Game.objects.filter().aget(rawg_slug=slug)
        except ObjectDoesNotExist:
            return Response({ERROR: GAME_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        release_year = game.rawg_release_date.year
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
            followed_user_games = UserGame.objects.filter(user__in=user_follow_query, game=game) \
                .exclude(status=UserGame.STATUS_NOT_PLAYED)
            serializer = FollowedUserGameSerializer(followed_user_games, many=True)
            friends_info = await serializer.adata
        except Game.DoesNotExist:
            user_info = None
            friends_info = ()

        return Response({'user_info': user_info, 'friends_info': friends_info})

    async def update(self, request, **kwargs):
        try:
            game = await Game.objects.aget(rawg_slug=kwargs.get('slug'))
        except Game.DoesNotExist:
            return Response({ERROR: GAME_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()
        data.update({'user': request.user.pk,
                     'game': game.pk})

        try:
            user_game = await UserGame.objects.aget(user=request.user, game=game)
            serializer = self.get_serializer(user_game, data=data)
        except UserGame.DoesNotExist:
            serializer = self.get_serializer(data=data)

        # todo: rework
        await sync_to_async(serializer.is_valid)(raise_exception=True)
        await serializer.asave()

        return Response(serializer.data, status=status.HTTP_200_OK)


async def update_game_genres(game: Game, rawg_game: dict) -> None:
    existing_game_genres = GameGenre.objects.filter(game=game)
    new_game_genres = []
    game_genres_to_delete_ids = []

    for genre in rawg_game.get('genres'):
        genre_obj, created = await Genre.objects.aget_or_create(rawg_id=genre.get('id'),
                                                                defaults={
                                                                    'rawg_name': genre.get('name'),
                                                                    'rawg_slug': genre.get('slug')
                                                                })
        game_genre_obj, created = await GameGenre.objects.aget_or_create(genre=genre_obj, game=game)
        new_game_genres.append(game_genre_obj)

    async for existing_game_genre in existing_game_genres:
        if existing_game_genre not in new_game_genres:
            game_genres_to_delete_ids.append(existing_game_genre.id)

    await GameGenre.objects.filter(id__in=game_genres_to_delete_ids).adelete()


async def update_game_stores(game: Game, rawg_game: dict) -> None:
    existing_game_stores = GameStore.objects.filter(game=game)
    new_game_stores = []
    game_stores_to_delete_ids = []
    stores = rawg.get_stores(rawg_game.get('slug'))

    for game_store in rawg_game.get('stores'):
        store = game_store['store']
        store_obj, created = await Store.objects.aget_or_create(rawg_id=store.get('id'),
                                                                defaults={
                                                                    'rawg_name': store.get('name'),
                                                                    'rawg_slug': store.get('slug')
                                                                })
        game_store_url = find_game_store_url(stores, store_obj)
        game_store_obj, created = await GameStore.objects.aget_or_create(store=store_obj, game=game,
                                                                         defaults={
                                                                             'url': game_store_url
                                                                         })
        if game_store_obj.url != game_store_url:
            game_store_obj.url = game_store_url
            await game_store_obj.asave(update_fields=('url',))

        new_game_stores.append(game_store_obj)

    async for existing_game_store in existing_game_stores:
        if existing_game_store not in new_game_stores:
            game_stores_to_delete_ids.append(existing_game_store.id)

    await GameStore.objects.filter(id__in=game_stores_to_delete_ids).adelete()


def find_game_store_url(game_stores: List[rawgpy.GameStore], store_obj: Store) -> str:
    for game_store in game_stores:
        if store_obj.rawg_id == game_store.store_id:
            return game_store.url


def translate_hltb_time(hltb_game, time_key, new_time_key, time_unit):
    if hltb_game is None or hltb_game.get(time_key) == -1:
        return

    gameplay_time = hltb_game.get(time_key)
    gameplay_unit = float_to_hours(gameplay_time)
    hltb_game.update({new_time_key: gameplay_time, time_unit: gameplay_unit})


def get_game_search_results(query, page, page_size):
    key = f'tmdb_game_search_{query.replace(" ", "_")}_page_{page}_page_size_{page_size}'
    results = cache.get(key, None)
    if results is None:
        search_result = rawg.search(query, num_results=page_size, additional_param=f"&page={page}")
        results = []
        for game in search_result:
            results.append(game.json)
        cache.set(key, results, CACHE_TIMEOUT)
    return results


def get_hltb_game(game_name: str, release_year: int):
    key = get_hltb_game_key(game_name)
    hltb_game = cache.get(key, None)
    game_name = game_name.replace('’', '\'')
    if hltb_game is None:
        try:
            results = HowLongToBeat(1).search(game_name, similarity_case_sensitive=False)
            if len(results) == 0:
                results = HowLongToBeat(1).search(game_name.split('(')[0].strip(), similarity_case_sensitive=False)

            same_year_games = [x for x in results if x.release_world == release_year]
            if len(results) > 0 and len(same_year_games) == 0:
                pass
            else:
                results = same_year_games
            hltb_game = max(results, key=lambda element: element.similarity).__dict__
            cache.set(key, hltb_game, CACHE_TIMEOUT)
        except (ValueError, TypeError):
            hltb_game = None
            cache.set(key, hltb_game, CACHE_TIMEOUT)
        except ConnectionError:
            hltb_game = None

    translate_hltb_time(hltb_game, 'main_story', 'gameplay_main', 'gameplay_main_unit')
    translate_hltb_time(hltb_game, 'main_extra', 'gameplay_main_extra', 'gameplay_main_extra_unit')
    translate_hltb_time(hltb_game, 'completionist', 'gameplay_completionist', 'gameplay_completionist_unit')

    return hltb_game


def get_rawg_game(slug):
    returned_from_cache = True
    key = get_rawg_game_key(slug)
    # rawg_game = cache.get(key, None)
    rawg_game = None
    if rawg_game is None:
        rawg_game = rawg.get_game(slug).json
        cache.set(key, rawg_game, CACHE_TIMEOUT)
        returned_from_cache = False

    return rawg_game, returned_from_cache


def parse_game(rawg_game, hltb_game=None):
    platforms = [obj['platform'] for obj in rawg_game['platforms']]

    new_game = {
        'name': rawg_game.get('name'),
        'slug': rawg_game.get('slug'),
        'overview': rawg_game.get('description'),
        'metacritic': rawg_game.get('metacritic'),
        'genres': objects_to_str(rawg_game['genres']),
        'developers': objects_to_str(rawg_game['developers']),
        'platforms': objects_to_str(platforms),
        'background': rawg_game.get('background_image_additional')
        if rawg_game.get('background_image_additional') is not None
        else rawg_game.get('background_image'),
        'poster': rawg_game.get('background_image'),
        'release_date': '.'.join(reversed(rawg_game['released'].split('-')))
        if rawg_game.get('released') is not None else None,
        'playtime': f'{rawg_game.get("playtime")} {int_to_hours(rawg_game.get("playtime"))}',
        'stores': rawg_game.get('stores'),
    }

    if hltb_game is not None:
        translate_hltb_time(hltb_game, 'main_story', 'gameplay_main', 'gameplay_main_unit')
        translate_hltb_time(hltb_game, 'main_extra', 'gameplay_main_extra', 'gameplay_main_extra_unit')
        translate_hltb_time(hltb_game, 'completionist', 'gameplay_completionist', 'gameplay_completionist_unit')
        new_game.update({'hltb': hltb_game})

    return new_game
