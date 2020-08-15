import rawgpy
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.forms import model_to_dict
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from howlongtobeatpy import HowLongToBeat
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from games.logger import status_changed, score_changed, review_changed
from games.models import Game, UserGame

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
        user_game = model_to_dict(UserGame.objects
                                  .exclude(status=UserGame.STATUS_NOT_PLAYED)
                                  .get(user=request.user, game=game))
    except (Game.DoesNotExist, UserGame.DoesNotExist):
        user_game = None

    return Response({'rawg': rawg_game.json, 'hltb': hltb_game,
                     'user_info': user_game})


@swagger_auto_schema(method='PUT', request_body=openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'status': openapi.Schema(type=openapi.TYPE_STRING, enum=list(dict(UserGame.STATUS_CHOICES).keys())),
    },
))
@api_view(['PUT'])
def set_status(request, slug):
    try:
        game_status = request.POST['status']
    except KeyError as e:
        return Response(f'Did you forget {e.args[0]} parameter?', status=status.HTTP_400_BAD_REQUEST)

    dict_statuses = dict(UserGame.STATUS_CHOICES)
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
    status_changed(user=request.user, game=game, status=game_status)

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
    try:
        score = request.POST['score']
    except KeyError as e:
        return Response(f'Something wrong with parameters. Did you forget \'{e.args[0]}\' parameter?',
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        game = Game.objects.get(rawg_slug=slug)
    except Game.DoesNotExist:
        return Response('Game not found. Check your slug', status=status.HTTP_404_NOT_FOUND)

    try:
        user_game = UserGame.objects.exclude(status=UserGame.STATUS_NOT_PLAYED).get(user=request.user, game=game)
    except UserGame.DoesNotExist:
        return Response('UserGame not found. Check your slug', status=status.HTTP_404_NOT_FOUND)

    try:
        user_game.score = score
        user_game.full_clean()
        user_game.save()
    except ValidationError as e:
        return Response(e.message_dict.items(), status=status.HTTP_400_BAD_REQUEST)

    score_changed(user=request.user, game=game, score=score)

    return Response(status=status.HTTP_204_NO_CONTENT)


@swagger_auto_schema(method='PATCH', request_body=openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'review': openapi.Schema(type=openapi.TYPE_STRING, description="Отзыв"),
    }
))
@api_view(['PATCH'])
def set_review(request, slug):
    try:
        review = request.POST['review']
    except KeyError as e:
        return Response(f'Something wrong with parameters. Did you forget \'{e.args[0]}\' parameter?',
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        game = Game.objects.get(rawg_slug=slug)
    except Game.DoesNotExist:
        return Response('Game not found. Check your slug', status=status.HTTP_404_NOT_FOUND)

    try:
        user_game = UserGame.objects.exclude(status=UserGame.STATUS_NOT_PLAYED).get(user=request.user, game=game)
    except UserGame.DoesNotExist:
        return Response('UserGame not found. Check your slug', status=status.HTTP_404_NOT_FOUND)

    try:
        user_game.review = review
        user_game.full_clean()
        user_game.save()
    except ValidationError as e:
        return Response(e.message_dict.items(), status=status.HTTP_400_BAD_REQUEST)

    review_changed(user=request.user, game=game, review=review)

    return Response(status=status.HTTP_204_NO_CONTENT)
