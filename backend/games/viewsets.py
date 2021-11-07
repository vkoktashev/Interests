from json import JSONDecodeError

from django.contrib.postgres.search import TrigramSimilarity
from django.core.cache import cache
from django.core.paginator import Paginator
from django.db import transaction
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from howlongtobeatpy import HowLongToBeat
from requests.exceptions import ConnectionError
from rest_framework import status, mixins
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from games.functions import get_game_new_fields, get_hltb_game_key, get_rawg_game_key
from games.models import Game, UserGame, Genre, GameGenre
from games.serializers import UserGameSerializer, FollowedUserGameSerializer, GameSerializer
from users.models import UserFollow
from utils.constants import RAWG_UNAVAILABLE, ERROR, rawg, DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE, \
    GAME_NOT_FOUND, CACHE_TIMEOUT
from utils.documentation import GAMES_SEARCH_200_EXAMPLE, GAME_RETRIEVE_200_EXAMPLE
from utils.functions import int_to_hours, get_page_size, int_to_minutes, update_fields_if_needed, \
    objects_to_str
from utils.openapi_params import query_param, page_param, page_size_param


class SearchGamesViewSet(GenericViewSet, mixins.ListModelMixin):
    queryset = Game.objects.all()

    @swagger_auto_schema(manual_parameters=[query_param, page_param, page_size_param],
                         responses={
                             status.HTTP_200_OK: openapi.Response(
                                 description=status.HTTP_200_OK,
                                 examples={
                                     "application/json": GAMES_SEARCH_200_EXAMPLE
                                 }
                             )
                         })
    @action(detail=False, methods=['get'])
    def rawg(self, request, *args, **kwargs):
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

    @swagger_auto_schema(responses={
        status.HTTP_200_OK: openapi.Response(
            description=status.HTTP_200_OK,
            examples={
                "application/json": GAME_RETRIEVE_200_EXAMPLE
            }
        ),
        status.HTTP_404_NOT_FOUND: openapi.Response(
            description=status.HTTP_404_NOT_FOUND,
            examples={
                "application/json": {
                    ERROR: GAME_NOT_FOUND
                }
            }
        ),
        status.HTTP_503_SERVICE_UNAVAILABLE: openapi.Response(
            description=status.HTTP_503_SERVICE_UNAVAILABLE,
            examples={
                "application/json": {
                    ERROR: RAWG_UNAVAILABLE
                },
            }
        )
    })
    def retrieve(self, request, *args, **kwargs):
        try:
            rawg_game, returned_from_cache = get_rawg_game(kwargs.get('slug'))
        except KeyError:
            return Response({ERROR: GAME_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        except JSONDecodeError:
            return Response({ERROR: RAWG_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        hltb_game = get_hltb_game(rawg_game.get('name'))
        new_fields = get_game_new_fields(rawg_game, hltb_game)

        game, created = Game.objects.filter().get_or_create(rawg_slug=rawg_game.get('slug'),
                                                            defaults=new_fields)
        if not created and not returned_from_cache:
            update_fields_if_needed(game, new_fields)

        if created or not returned_from_cache:
            update_game_genres(game, rawg_game)

        parsed_game = parse_game(rawg_game, hltb_game)

        return Response(parsed_game)

    @swagger_auto_schema(responses={status.HTTP_200_OK: FollowedUserGameSerializer(many=True)})
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def user_info(self, request, *args, **kwargs):
        try:
            game = Game.objects.get(rawg_slug=kwargs.get('slug'))

            try:
                user_game = UserGame.objects.exclude(status=UserGame.STATUS_NOT_PLAYED).get(user=request.user,
                                                                                            game=game)
                user_info = self.get_serializer(user_game).data
            except UserGame.DoesNotExist:
                user_info = None

            user_follow_query = UserFollow.objects.filter(user=request.user, is_following=True).values('followed_user')
            followed_user_games = UserGame.objects.filter(user__in=user_follow_query, game=game) \
                .exclude(status=UserGame.STATUS_NOT_PLAYED)
            serializer = FollowedUserGameSerializer(followed_user_games, many=True)
            friends_info = serializer.data
        except Game.DoesNotExist:
            user_info = None
            friends_info = ()

        return Response({'user_info': user_info, 'friends_info': friends_info})

    @swagger_auto_schema(
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                "status": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    enum=list(dict(UserGame.STATUS_CHOICES).keys()) + list(dict(UserGame.STATUS_CHOICES).values())
                ),
                "score": openapi.Schema(
                    type=openapi.TYPE_INTEGER,
                    minimum=UserGame._meta.get_field('score').validators[0].limit_value,
                    maximum=UserGame._meta.get_field('score').validators[1].limit_value
                ),
                "review": openapi.Schema(
                    type=openapi.TYPE_STRING,
                    maxLength=UserGame._meta.get_field('review').max_length

                ),
                'spent_time': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    format=openapi.FORMAT_DECIMAL,
                    pattern=r'^\d{0,6}\.\d{1}$'
                )
            }
        ),
        responses={
            status.HTTP_404_NOT_FOUND: openapi.Response(
                description=status.HTTP_404_NOT_FOUND,
                examples={
                    "application/json": {
                        ERROR: GAME_NOT_FOUND
                    }
                }
            )
        }
    )
    def update(self, request, *args, **kwargs):
        try:
            game = Game.objects.get(rawg_slug=kwargs.get('slug'))
        except Game.DoesNotExist:
            return Response({ERROR: GAME_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        data = request.data.copy()
        data.update({'user': request.user.pk,
                     'game': game.pk})

        try:
            user_game = UserGame.objects.get(user=request.user, game=game)
            serializer = self.get_serializer(user_game, data=data)
        except UserGame.DoesNotExist:
            serializer = self.get_serializer(data=data)

        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_200_OK)


def update_game_genres(game: Game, rawg_game: dict) -> None:
    existing_game_genres = GameGenre.objects.filter(game=game)
    new_game_genres = []
    game_genres_to_delete_ids = []

    for genre in rawg_game.get('genres'):
        genre_obj, created = Genre.objects.get_or_create(rawg_id=genre.get('id'),
                                                         defaults={
                                                             'rawg_name': genre.get('name'),
                                                             'rawg_slug': genre.get('slug')
                                                         })
        game_genre_obj, created = GameGenre.objects.get_or_create(genre=genre_obj, game=game)
        new_game_genres.append(game_genre_obj)

    for existing_game_genre in existing_game_genres:
        if existing_game_genre not in new_game_genres:
            game_genres_to_delete_ids.append(existing_game_genre.id)

    GameGenre.objects.filter(id__in=game_genres_to_delete_ids).delete()


def translate_hltb_time(hltb_game, time, time_unit):
    if hltb_game is None or hltb_game.get(time) == -1:
        return

    gameplay_time = ''
    for s in hltb_game.get(time):
        if s.isdigit():
            gameplay_time += s
        else:
            break
    gameplay_time = int(gameplay_time)

    gameplay_unit = hltb_game.get(time_unit)
    if gameplay_unit == 'Hours':
        gameplay_unit = int_to_hours(gameplay_time)
    elif gameplay_unit == 'Mins':
        gameplay_unit = int_to_minutes(gameplay_time)
    hltb_game.update({time_unit: gameplay_unit})


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


def get_hltb_game(game_name):
    key = get_hltb_game_key(game_name)
    hltb_game = cache.get(key, None)

    if hltb_game is None:
        try:
            results = HowLongToBeat(1).search(game_name.replace('’', '\''), similarity_case_sensitive=False)
            hltb_game = max(results, key=lambda element: element.similarity).__dict__
            cache.set(key, hltb_game, CACHE_TIMEOUT)
        except (ValueError, TypeError):
            hltb_game = None
            cache.set(key, hltb_game, CACHE_TIMEOUT)
        except ConnectionError:
            hltb_game = None

    return hltb_game


def get_rawg_game(slug):
    returned_from_cache = True
    key = get_rawg_game_key(slug)
    rawg_game = cache.get(key, None)

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
    }

    if hltb_game is not None:
        translate_hltb_time(hltb_game, 'gameplay_main', 'gameplay_main_unit')
        translate_hltb_time(hltb_game, 'gameplay_main_extra', 'gameplay_main_extra_unit')
        translate_hltb_time(hltb_game, 'gameplay_completionist', 'gameplay_completionist_unit')
        new_game.update({'hltb': hltb_game})

    return new_game
