from json import JSONDecodeError

from django.core.cache import cache
from django.core.paginator import Paginator
from django.db import IntegrityError
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from howlongtobeatpy import HowLongToBeat
from rest_framework import status, mixins
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from games.models import Game, UserGame
from games.serializers import UserGameSerializer, FollowedUserGameSerializer
from users.models import UserFollow
from utils.constants import RAWG_UNAVAILABLE, ERROR, HLTB_UNAVAILABLE, rawg, DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE, \
    GAME_NOT_FOUND, CACHE_TIMEOUT
from utils.documentation import GAMES_SEARCH_200_EXAMPLE, GAME_RETRIEVE_200_EXAMPLE
from utils.functions import int_to_hours, translate_hltb_time, get_page_size
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
            rawg_game = get_game(kwargs.get('slug'))
        except KeyError:
            return Response({ERROR: GAME_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        except JSONDecodeError:
            return Response({ERROR: RAWG_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            results = get_hltb_search_result(rawg_game.get('name'))
            hltb_game = max(results, key=lambda element: element.similarity).__dict__
        except ValueError:
            hltb_game = None
        except ConnectionError:
            return Response({ERROR: HLTB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            game = Game.objects.get(rawg_slug=rawg_game.get('slug'))
            user_game = UserGame.objects.exclude(status=UserGame.STATUS_NOT_PLAYED).get(user=request.user, game=game)
            user_info = self.get_serializer(user_game).data
        except (Game.DoesNotExist, UserGame.DoesNotExist, TypeError):
            user_info = None

        rawg_game.update({'playtime': f'{rawg_game.get("playtime")} {int_to_hours(rawg_game.get("playtime"))}'})
        translate_hltb_time(hltb_game, 'gameplay_main', 'gameplay_main_unit')
        translate_hltb_time(hltb_game, 'gameplay_main_extra', 'gameplay_main_extra_unit')
        translate_hltb_time(hltb_game, 'gameplay_completionist', 'gameplay_completionist_unit')

        return Response({'rawg': rawg_game, 'hltb': hltb_game,
                         'user_info': user_info})

    @swagger_auto_schema(manual_parameters=[page_param, page_size_param],
                         responses={status.HTTP_200_OK: FollowedUserGameSerializer(many=True)})
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def friends_info(self, request, *args, **kwargs):
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)
        page_size = get_page_size(request.GET.get('page_size', DEFAULT_PAGE_SIZE))

        try:
            game = Game.objects.get(rawg_slug=kwargs.get('slug'))
            user_follow_query = UserFollow.objects.filter(user=request.user).values('followed_user')
            followed_user_games = UserGame.objects.filter(user__in=user_follow_query, game=game)
            serializer = FollowedUserGameSerializer(followed_user_games, many=True)
            friends_info = serializer.data
        except Game.DoesNotExist:
            friends_info = ()

        paginator = Paginator(friends_info, page_size)
        paginator_page = paginator.get_page(page)

        return Response({'friends_info': paginator_page.object_list,
                         'has_next_page': paginator_page.has_next()})

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
            ),
            status.HTTP_503_SERVICE_UNAVAILABLE: openapi.Response(
                description=status.HTTP_503_SERVICE_UNAVAILABLE,
                examples={
                    "application/json": {
                        ERROR: RAWG_UNAVAILABLE
                    },
                }
            )
        }
    )
    def update(self, request, *args, **kwargs):
        try:
            game = Game.objects.get(rawg_slug=kwargs.get('slug'))
        except Game.DoesNotExist:
            try:
                rawg_game = get_game(kwargs.get('slug'))
            except KeyError:
                return Response({ERROR: GAME_NOT_FOUND}, status=status.HTTP_400_BAD_REQUEST)
            except JSONDecodeError:
                return Response({ERROR: RAWG_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            try:
                results_list = get_hltb_search_result(rawg_game.get('name'))
                hltb_game = max(results_list, key=lambda element: element.similarity)
            except ValueError:
                hltb_game = None
            except ConnectionError:
                return Response({ERROR: HLTB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            try:
                if hltb_game is not None:
                    game = Game.objects.create(rawg_name=rawg_game.get('name'),
                                               rawg_id=rawg_game.get('id'),
                                               rawg_slug=rawg_game.get('slug'),
                                               hltb_name=hltb_game.game_name,
                                               hltb_id=hltb_game.game_id)
                else:
                    game = Game.objects.create(rawg_name=rawg_game.get('name'),
                                               rawg_id=rawg_game.get('id'),
                                               rawg_slug=rawg_game.get('slug'))
            except IntegrityError:
                return Response({ERROR: GAME_NOT_FOUND}, status=status.HTTP_400_BAD_REQUEST)

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


def get_game_search_results(query, page, page_size):
    key = f'tmdb_game_search_{query}_page_{page}_page_size_{page_size}'
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
        results = HowLongToBeat(0.9).search(game_name.replace('’', '\''),
                                            similarity_case_sensitive=False)
        cache.set(key, results, CACHE_TIMEOUT)
    return results


def get_game(slug):
    key = f'game_{slug}'
    rawg_game = cache.get(key, None)
    if rawg_game is None:
        rawg_game = rawg.get_game(slug).json
        cache.set(key, rawg_game, CACHE_TIMEOUT)
    return rawg_game
