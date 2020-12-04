from json import JSONDecodeError

from django.core.paginator import Paginator, EmptyPage
from django.db import IntegrityError
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from howlongtobeatpy import HowLongToBeat
from rest_framework import status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from games.models import Game, UserGame, rawg
from games.serializers import UserGameSerializer, FollowedUserGameSerializer
from users.models import UserFollow
from utils.functions import int_to_hours, translate_hltb_time

dict_statuses = dict(UserGame.STATUS_CHOICES)

query_param = openapi.Parameter('query', openapi.IN_QUERY, description="Поисковый запрос", type=openapi.TYPE_STRING)
page_param = openapi.Parameter('page', openapi.IN_QUERY, description="Номер страницы",
                               type=openapi.TYPE_INTEGER, default=1)


class SearchGamesViewSet(GenericViewSet, mixins.ListModelMixin):
    @swagger_auto_schema(manual_parameters=[query_param, page_param])
    def list(self, request, *args, **kwargs):
        query = request.GET.get('query', '')
        page = request.GET.get('page', 1)
        try:
            results = rawg.search(query, num_results=10, additional_param=f"&page={page}")
        except JSONDecodeError:
            return Response('Rawg unavailable', status=status.HTTP_503_SERVICE_UNAVAILABLE)
        games_json = []
        for game in results:
            games_json.append(game.json)
        return Response(games_json)


class GameViewSet(GenericViewSet, mixins.RetrieveModelMixin, mixins.UpdateModelMixin):
    queryset = UserGame.objects.all()
    serializer_class = UserGameSerializer
    lookup_field = 'slug'

    def retrieve(self, request, *args, **kwargs):
        try:
            rawg_game = rawg.get_game(kwargs.get('slug'))
        except KeyError:
            return Response('Wrong slug', status=status.HTTP_404_NOT_FOUND)
        except JSONDecodeError:
            return Response('Rawg unavailable', status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            results_list = HowLongToBeat(1.0).search(rawg_game.name)
            hltb_game = max(results_list, key=lambda element: element.similarity).__dict__
        except ValueError:
            hltb_game = None
        except ConnectionError:
            return Response('Hltb connection error, try again', status=status.HTTP_503_SERVICE_UNAVAILABLE)

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

    @swagger_auto_schema(manual_parameters=[page_param])
    @action(detail=True, methods=['get'])
    def friends_info(self, request, *args, **kwargs):
        try:
            page = int(request.GET.get('page'))
        except (ValueError, TypeError):
            return Response('Wrong page number', status=status.HTTP_400_BAD_REQUEST)

        friends_info = []

        try:
            game = Game.objects.get(rawg_slug=kwargs.get('slug'))
            user_follow_query = UserFollow.objects.filter(user=request.user)

            for user_follow in user_follow_query:
                followed_user_game = UserGame.objects.filter(user=user_follow.followed_user, game=game).first()
                if followed_user_game:
                    serializer = FollowedUserGameSerializer(followed_user_game)
                    friends_info.append(serializer.data)

        except (Game.DoesNotExist, UserGame.DoesNotExist, UserFollow.DoesNotExist):
            friends_info = None

        page_size = 10
        paginator = Paginator(friends_info, page_size)
        try:
            paginator_page = paginator.page(page)
        except EmptyPage:
            return Response('Wrong page number', status=status.HTTP_400_BAD_REQUEST)

        return Response({'friends_info': friends_info,
                         'has_next_page': paginator_page.has_next()})

    @swagger_auto_schema(request_body=UserGameSerializer)
    def update(self, request, *args, **kwargs):
        try:
            game = Game.objects.get(rawg_slug=kwargs.get('slug'))
        except Game.DoesNotExist:
            try:
                rawg_game = rawg.get_game(kwargs.get('slug'))
            except KeyError:
                return Response('Wrong slug', status=status.HTTP_400_BAD_REQUEST)
            except JSONDecodeError:
                return Response('Rawg unavailable', status=status.HTTP_503_SERVICE_UNAVAILABLE)

            try:
                results_list = HowLongToBeat(1.0).search(rawg_game.name)
                hltb_game = max(results_list, key=lambda element: element.similarity)
            except ValueError:
                hltb_game = None
            except ConnectionError:
                return Response('Hltb connection error', status=status.HTTP_503_SERVICE_UNAVAILABLE)

            try:
                if hltb_game is not None:
                    game = Game.objects.create(rawg_name=rawg_game.name, rawg_id=rawg_game.id, rawg_slug=rawg_game.slug,
                                               hltb_name=hltb_game.game_name, hltb_id=hltb_game.game_id)
                else:
                    game = Game.objects.create(rawg_name=rawg_game.name, rawg_id=rawg_game.id, rawg_slug=rawg_game.slug)
            except IntegrityError:
                return Response('Wrong slug', status=status.HTTP_400_BAD_REQUEST)

        data = request.data.copy()
        data.update({'user': request.user.pk,
                     'game': game.pk})

        try:
            user_game = UserGame.objects.get(user=request.user, game=game)
            serializer = self.get_serializer(user_game, data=data)
            created = False
        except UserGame.DoesNotExist:
            serializer = self.get_serializer(data=data)
            created = True

        serializer.is_valid(raise_exception=True)
        serializer.save()

        if created:
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(serializer.data, status=status.HTTP_200_OK)
