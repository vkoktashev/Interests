import rawgpy
from django.core.exceptions import ValidationError
from howlongtobeatpy import HowLongToBeat
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from games.models import Game, UserGameScore


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
        game = rawg.get_game(slug)
    except KeyError:
        return Response('Wrong slug', status=status.HTTP_400_BAD_REQUEST)
    print(game.json)
    results_list = HowLongToBeat().search(game.name)
    hltb = None
    if results_list is not None and len(results_list) > 0:
        best_element = max(results_list, key=lambda element: element.similarity)
        hltb = {'id': best_element.game_id, 'name': best_element.game_name,
                'gameplay_main': best_element.gameplay_main,
                'gameplay_main_unit': best_element.gameplay_main_unit,
                'gameplay_main_label': best_element.gameplay_main_label,
                'gameplay_main_extra': best_element.gameplay_main_extra,
                'gameplay_main_extra_unit': best_element.gameplay_main_extra_unit,
                'gameplay_main_extra_label': best_element.gameplay_main_extra_label,
                'gameplay_completionist': best_element.gameplay_completionist,
                'gameplay_completionist_unit': best_element.gameplay_completionist_unit,
                'gameplay_completionist_label': best_element.gameplay_completionist_label,
                'similarity': best_element.similarity}

    return Response({'rawg': game.json, 'hltb': hltb})


@api_view(['POST'])
def set_score(request):
    user = request.user
    rawg_id = request.data['rawg_id']
    score = request.data['score']

    try:
        game = Game.objects.get(rawg_id=rawg_id)
    except Game.DoesNotExist:
        rawg = rawgpy.RAWG("Interests. Contact us via your_interests@mail.ru")
        try:
            rawg_game = rawg.get_game(rawg_id)
        except KeyError:
            return Response('Wrong slug', status=status.HTTP_400_BAD_REQUEST)

        results_list = HowLongToBeat().search(rawg_game.name)
        hltb_game = None
        if results_list is not None and len(results_list) > 0:
            hltb_game = max(results_list, key=lambda element: element.similarity)

        if hltb_game is not None:
            game = Game.objects.create(rawg_name=rawg_game.name, rawg_id=rawg_game.id, rawg_slug=rawg_game.slug,
                                       hltb_name=hltb_game.game_name, hltb_id=hltb_game.game_id)
        else:
            game = Game.objects.create(rawg_name=rawg_game.name, rawg_id=rawg_game.id, rawg_slug=rawg_game.slug,
                                       hltb_name=None, hltb_id=None)
    except ValueError as e:
        return Response(e.args[0], status=status.HTTP_400_BAD_REQUEST)

    user_game_score, created = UserGameScore.objects.get_or_create(user=user, game=game)
    try:
        user_game_score.score = score
        user_game_score.full_clean()
        user_game_score.save()
    except ValidationError as e:
        return Response(e.message_dict.items(), status=status.HTTP_400_BAD_REQUEST)

    return Response('All fine!', status=status.HTTP_200_OK)


@api_view(['POST'])
def set_review(request):
    pass
