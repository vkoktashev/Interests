import rawgpy
from django.db import IntegrityError
from django.forms import model_to_dict
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from howlongtobeatpy import HowLongToBeat
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from games.logger import log_status_message
from games.models import Game, UserGame
from games.utils import set_parameter

query_param = openapi.Parameter('query', openapi.IN_QUERY, description="Поисковый запрос", type=openapi.TYPE_STRING)
page_param = openapi.Parameter('page', openapi.IN_QUERY, description="Номер страницы",
                               type=openapi.TYPE_INTEGER, default=1)


@swagger_auto_schema(method='GET', manual_parameters=[query_param, page_param])
@api_view(['GET'])
def search(request):
    rawg = rawgpy.RAWG("Interests. Contact us via your_interests@mail.ru")
    query = request.GET.get('query', '')
    page = request.GET.get('page', 1)
    results = rawg.search(query, num_results=10, additional_param=f"&page={page}")
    games_json = []
    for game in results:
        games_json.append(game.json)
    return Response(games_json)


@api_view(['GET'])
def get_game(request, slug):
    rawg = rawgpy.RAWG("Interests. Contact us via your_interests@mail.ru")
    try:
        rawg_game = rawg.get_game(slug)
    except KeyError:
        return Response('Wrong slug', status=status.HTTP_400_BAD_REQUEST)

    results_list = HowLongToBeat(1.0).search(rawg_game.name)
    hltb_game = None
    if results_list is not None and len(results_list) > 0:
        hltb_game = max(results_list, key=lambda element: element.similarity).__dict__

    try:
        game = Game.objects.get(rawg_slug=rawg_game.slug)
        user_game = model_to_dict(UserGame.objects.get(user=request.user, game=game))
    except (Game.DoesNotExist, UserGame.DoesNotExist):
        user_game = None

    return Response({'rawg': rawg_game.json, 'hltb': hltb_game,
                     'user_info': user_game})


@swagger_auto_schema(method='PUT', request_body=openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'status': openapi.Schema(type=openapi.TYPE_STRING, enum=['playing', 'completed', 'stopped', 'going']),
    },
))
@api_view(['PUT'])
def set_status(request, slug):
    try:
        game_status = request.POST['status']
    except KeyError as e:
        return Response(f'Did you forget {e.args[0]} parameter?', status=status.HTTP_400_BAD_REQUEST)

    dict_statuses = dict(UserGame.GAME_STATUS_CHOICES)
    if game_status not in dict_statuses:
        return Response(f'Wrong status, must be on of {dict_statuses.keys()}', status=status.HTTP_400_BAD_REQUEST)

    try:
        game = Game.objects.get(rawg_slug=slug)
    except Game.DoesNotExist:
        rawg = rawgpy.RAWG("Interests. Contact us via your_interests@mail.ru")
        try:
            rawg_game = rawg.get_game(slug)
        except KeyError:
            return Response('Wrong slug', status=status.HTTP_400_BAD_REQUEST)

        results_list = HowLongToBeat(1.0).search(rawg_game.name)
        hltb_game = None
        if results_list is not None and len(results_list) > 0:
            hltb_game = max(results_list, key=lambda element: element.similarity)
        try:
            if hltb_game is not None:
                game = Game.objects.create(rawg_name=rawg_game.name, rawg_id=rawg_game.id, rawg_slug=rawg_game.slug,
                                           hltb_name=hltb_game.game_name, hltb_id=hltb_game.game_id)
            else:
                game = Game.objects.create(rawg_name=rawg_game.name, rawg_id=rawg_game.id, rawg_slug=rawg_game.slug)
        except IntegrityError:
            return Response('Wrong slug', status=status.HTTP_400_BAD_REQUEST)

    user_game, created = UserGame.objects.get_or_create(user=request.user, game=game)
    user_game.status = game_status
    user_game.save()

    log_status_message(user=request.user, game_name=game.rawg_name, status=game_status)

    if created:
        return Response(status=status.HTTP_201_CREATED)
    else:
        return Response(status=status.HTTP_204_NO_CONTENT)


@swagger_auto_schema(method='PATCH', request_body=openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'score': openapi.Schema(type=openapi.TYPE_INTEGER, description="Оценка", minimum=0, maximum=10),
    }
))
@api_view(['PATCH'])
def set_score(request, slug):
    return set_parameter(request, slug, 'score')


@swagger_auto_schema(method='PATCH', request_body=openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'review': openapi.Schema(type=openapi.TYPE_STRING, description="Отзыв"),
    }
))
@api_view(['PATCH'])
def set_review(request, slug):
    return set_parameter(request, slug, 'review')
