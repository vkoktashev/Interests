import rawgpy
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from howlongtobeatpy import HowLongToBeat
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from games.models import Game, UserGame, GameLog
from games.serializers import UserGameSerializer

rawg = rawgpy.RAWG("Interests. Contact us via your_interests@mail.ru")
dict_statuses = dict(UserGame.STATUS_CHOICES)

query_param = openapi.Parameter('query', openapi.IN_QUERY, description="Поисковый запрос", type=openapi.TYPE_STRING)
page_param = openapi.Parameter('page', openapi.IN_QUERY, description="Номер страницы",
                               type=openapi.TYPE_INTEGER, default=1)


@swagger_auto_schema(method='GET', manual_parameters=[query_param, page_param])
@api_view(['GET'])
def search(request):
    query = request.GET.get('query', '')
    page = request.GET.get('page', 1)
    results = rawg.search(query, num_results=10, additional_param=f"&page={page}")
    games_json = []
    for game in results:
        games_json.append(game.json)
    return Response(games_json)


@api_view(['GET'])
def get_game(request, slug):
    try:
        rawg_game = rawg.get_game(slug)
    except KeyError:
        return Response('Wrong slug', status=status.HTTP_400_BAD_REQUEST)

    try:
        results_list = HowLongToBeat(1.0).search(rawg_game.name)
        hltb_game = max(results_list, key=lambda element: element.similarity).__dict__
    except ValueError:
        hltb_game = None
    except ConnectionError:
        return Response('Hltb connection error, try again', status=status.HTTP_502_BAD_GATEWAY)

    try:
        game = Game.objects.get(rawg_slug=rawg_game.slug)
        user_game = UserGame.objects.exclude(status=UserGame.STATUS_NOT_PLAYED).get(user=request.user, game=game)
        serializer = UserGameSerializer(user_game)
        user_info = serializer.data
    except (Game.DoesNotExist, UserGame.DoesNotExist):
        user_info = None

    return Response({'rawg': rawg_game.json, 'hltb': hltb_game,
                     'user_info': user_info})


@swagger_auto_schema(method='PUT', request_body=openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'status': openapi.Schema(type=openapi.TYPE_STRING, enum=list(dict_statuses.values())),
    },
))
@api_view(['PUT'])
def set_status(request, slug):
    try:
        game_status = request.data['status']
    except KeyError as e:
        return Response(f'Did you forget {e.args[0]} parameter?', status=status.HTTP_400_BAD_REQUEST)

    if game_status not in dict_statuses.values():
        return Response(f'Wrong status, must be one of {dict_statuses.values()}', status=status.HTTP_400_BAD_REQUEST)

    game_status = list(dict_statuses.keys())[list(dict_statuses.values()).index(game_status)]

    try:
        game = Game.objects.get(rawg_slug=slug)
    except Game.DoesNotExist:
        try:
            rawg_game = rawg.get_game(slug)
        except KeyError:
            return Response('Wrong slug', status=status.HTTP_400_BAD_REQUEST)

        try:
            results_list = HowLongToBeat(1.0).search(rawg_game.name)
            hltb_game = max(results_list, key=lambda element: element.similarity)
        except ValueError:
            hltb_game = None
        except ConnectionError:
            return Response('Hltb connection error, try again', status=status.HTTP_502_BAD_GATEWAY)

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
    GameLog.objects.create(user=request.user, game=game,
                           action_type=GameLog.ACTION_TYPE_STATUS, action_result=game_status)

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
        score = request.data['score']
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

    GameLog.objects.create(user=request.user, game=game, action_type=GameLog.ACTION_TYPE_SCORE, action_result=score)

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
        review = request.data['review']
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

    GameLog.objects.create(user=request.user, game=game, action_type=GameLog.ACTION_TYPE_REVIEW, action_result=review)

    return Response(status=status.HTTP_204_NO_CONTENT)


@swagger_auto_schema(method='PATCH', request_body=openapi.Schema(
    type=openapi.TYPE_OBJECT,
    properties={
        'time': openapi.Schema(type=openapi.TYPE_STRING, description="Время, потраченное на игру"),
    }
))
@api_view(['PATCH'])
def set_time(request, slug):
    try:
        time = request.data['time']
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
        user_game.spent_time = time
        user_game.full_clean()
        user_game.save()
    except ValidationError as e:
        return Response(e.message_dict.items(), status=status.HTTP_400_BAD_REQUEST)

    GameLog.objects.create(user=request.user, game=game, action_type=GameLog.ACTION_TYPE_TIME, action_result=time)

    return Response(status=status.HTTP_204_NO_CONTENT)
