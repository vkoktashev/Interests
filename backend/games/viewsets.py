from json import JSONDecodeError

from django.core.cache import cache
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

from games.models import Game, UserGame, Genre, GameGenre
from games.serializers import UserGameSerializer, FollowedUserGameSerializer
from users.models import UserFollow
from utils.constants import RAWG_UNAVAILABLE, ERROR, rawg, DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE, \
    GAME_NOT_FOUND, CACHE_TIMEOUT
from utils.documentation import GAMES_SEARCH_200_EXAMPLE, GAME_RETRIEVE_200_EXAMPLE
from utils.functions import int_to_hours, get_page_size, int_to_minutes, update_fields_if_needed, get_rawg_game_key
from utils.openapi_params import query_param, page_param, page_size_param


class SearchGamesViewSet(GenericViewSet, mixins.ListModelMixin):
    @swagger_auto_schema(manual_parameters=[query_param, page_param, page_size_param],
                         responses={
                             status.HTTP_200_OK: openapi.Response(
                                 description=status.HTTP_200_OK,
                                 examples={
                                     "application/json": GAMES_SEARCH_200_EXAMPLE
                                 }
                             )
                         })
    def list(self, request, *args, **kwargs):
        query = request.GET.get('query', '')
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)
        page_size = get_page_size(request.GET.get('page_size', DEFAULT_PAGE_SIZE))

        try:
            results = get_game_search_results(query, page, page_size)
        except JSONDecodeError:
            return Response(RAWG_UNAVAILABLE, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response(results)


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

        try:
            results = get_hltb_search_result(rawg_game.get('name'))
            hltb_game = max(results, key=lambda element: element.similarity).__dict__
            hltb_game_name = hltb_game.get('game_name')
            hltb_game_id = hltb_game.get('game_id')
        except (ValueError, TypeError, ConnectionError):
            hltb_game = None
            hltb_game_name = ''
            hltb_game_id = None

        new_fields = {
            'rawg_slug': rawg_game.get('slug'),
            'rawg_name': rawg_game.get('name'),
            'rawg_release_date': rawg_game.get('released'),
            'rawg_tba': rawg_game.get('tba'),
            'rawg_backdrop_path': rawg_game.get('background_image'),
            'hltb_name': hltb_game_name,
            'hltb_id': hltb_game_id
        }

        with transaction.atomic():
            game, created = Game.objects.select_for_update().get_or_create(rawg_id=rawg_game.get('id'),
                                                                           defaults=new_fields)
            if not created and not returned_from_cache:
                update_fields_if_needed(game, new_fields)

        if created or not returned_from_cache:
            for genre in rawg_game.get('genres'):
                genre_obj, created = Genre.objects.get_or_create(rawg_id=genre.get('id'),
                                                                 defaults={
                                                                     'rawg_name': genre.get('name'),
                                                                     'rawg_slug': genre.get('slug')
                                                                 })
                GameGenre.objects.get_or_create(genre=genre_obj, game=game)

        rawg_game.update({'playtime': f'{rawg_game.get("playtime")} {int_to_hours(rawg_game.get("playtime"))}'})
        translate_hltb_time(hltb_game, 'gameplay_main', 'gameplay_main_unit')
        translate_hltb_time(hltb_game, 'gameplay_main_extra', 'gameplay_main_extra_unit')
        translate_hltb_time(hltb_game, 'gameplay_completionist', 'gameplay_completionist_unit')

        return Response({'rawg': rawg_game, 'hltb': hltb_game})

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

            user_follow_query = UserFollow.objects.filter(user=request.user).values('followed_user')
            followed_user_games = UserGame.objects.filter(user__in=user_follow_query, game=game)
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


def get_hltb_search_result(game_name):
    key = f'hltb_search_{game_name.replace(" ", "_")}'
    results = cache.get(key, None)
    if results is None:
        results = HowLongToBeat(1.0).search(game_name.replace('’', '\''),
                                            similarity_case_sensitive=False)
        cache.set(key, results, CACHE_TIMEOUT)
    return results


def get_rawg_game(slug):
    returned_from_cache = True
    key = get_rawg_game_key(slug)
    rawg_game = cache.get(key, None)
    if rawg_game is None:
        rawg_game = rawg.get_game(slug).json
        cache.set(key, rawg_game, CACHE_TIMEOUT)
        returned_from_cache = False
    return rawg_game, returned_from_cache
