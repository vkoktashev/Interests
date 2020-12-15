from json import JSONDecodeError

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
from utils.constants import RAWG_UNAVAILABLE, ERROR, WRONG_SLUG, HLTB_UNAVAILABLE, FRIENDS_INFO_200_EXAMPLE, \
    GAMES_SEARCH_200_EXAMPLE, GAME_RETRIEVE_200_EXAMPLE, rawg, DEFAULT_PAGE_NUMBER, DEFAULT_PAGE_SIZE
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
        page_size = request.GET.get('page_size', DEFAULT_PAGE_SIZE)
        try:
            results = rawg.search(query, num_results=page_size, additional_param=f"&page={page}")
        except JSONDecodeError:
            return Response(RAWG_UNAVAILABLE, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        games_json = []
        for game in results:
            games_json.append(game.json)
        return Response(games_json)


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
                    ERROR: WRONG_SLUG
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
            rawg_game = rawg.get_game(kwargs.get('slug'))
        except KeyError:
            return Response({ERROR: WRONG_SLUG}, status=status.HTTP_404_NOT_FOUND)
        except JSONDecodeError:
            return Response({ERROR: RAWG_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            results_list = HowLongToBeat(0.9).search(rawg_game.name.replace('’', '\''), similarity_case_sensitive=False)
            hltb_game = max(results_list, key=lambda element: element.similarity).__dict__
        except ValueError:
            hltb_game = None
        except ConnectionError:
            return Response({ERROR: HLTB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            game = Game.objects.get(rawg_slug=rawg_game.slug)
            user_game = UserGame.objects.exclude(status=UserGame.STATUS_NOT_PLAYED).get(user=request.user, game=game)
            user_info = self.get_serializer(user_game).data
        except (Game.DoesNotExist, UserGame.DoesNotExist, TypeError):
            user_info = None

        rawg_game.json.update({'playtime': f'{rawg_game.playtime} {int_to_hours(rawg_game.playtime)}'})
        translate_hltb_time(hltb_game, 'gameplay_main', 'gameplay_main_unit')
        translate_hltb_time(hltb_game, 'gameplay_main_extra', 'gameplay_main_extra_unit')
        translate_hltb_time(hltb_game, 'gameplay_completionist', 'gameplay_completionist_unit')

        return Response({'rawg': rawg_game.json, 'hltb': hltb_game,
                         'user_info': user_info})

    @swagger_auto_schema(manual_parameters=[page_param, page_size_param],
                         responses=FRIENDS_INFO_200_EXAMPLE)
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def friends_info(self, request, *args, **kwargs):
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)
        page_size = get_page_size(request.GET.get('page_size', DEFAULT_PAGE_SIZE))

        try:
            game = Game.objects.get(rawg_slug=kwargs.get('slug'))
            user_follow_query = UserFollow.objects.filter(user=request.user)
            friends_info = []
            for user_follow in user_follow_query:
                followed_user_game = UserGame.objects.filter(user=user_follow.followed_user, game=game).first()
                if followed_user_game:
                    serializer = FollowedUserGameSerializer(followed_user_game)
                    friends_info.append(serializer.data)

        except Game.DoesNotExist:
            friends_info = []

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
                        ERROR: WRONG_SLUG
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
                rawg_game = rawg.get_game(kwargs.get('slug'))
            except KeyError:
                return Response({ERROR: WRONG_SLUG}, status=status.HTTP_400_BAD_REQUEST)
            except JSONDecodeError:
                return Response({ERROR: RAWG_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            try:
                results_list = HowLongToBeat(0.9).search(rawg_game.name.replace('’', '\''),
                                                         similarity_case_sensitive=False)
                hltb_game = max(results_list, key=lambda element: element.similarity)
            except ValueError:
                hltb_game = None
            except ConnectionError:
                return Response({ERROR: HLTB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

            try:
                if hltb_game is not None:
                    game = Game.objects.create(rawg_name=rawg_game.name, rawg_id=rawg_game.id, rawg_slug=rawg_game.slug,
                                               hltb_name=hltb_game.game_name, hltb_id=hltb_game.game_id)
                else:
                    game = Game.objects.create(rawg_name=rawg_game.name, rawg_id=rawg_game.id, rawg_slug=rawg_game.slug)
            except IntegrityError:
                return Response({ERROR: WRONG_SLUG}, status=status.HTTP_400_BAD_REQUEST)

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
