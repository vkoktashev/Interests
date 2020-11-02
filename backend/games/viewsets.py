from json import JSONDecodeError

from django.db import IntegrityError
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from howlongtobeatpy import HowLongToBeat
from rest_framework import status, mixins
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from games.models import Game, UserGame, rawg
from games.serializers import UserGameSerializer

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

        return Response({'rawg': rawg_game.json, 'hltb': hltb_game,
                         'user_info': user_info})

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
