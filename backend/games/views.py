import rawgpy
from howlongtobeatpy import HowLongToBeat
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['GET'])
def search(request):
    rawg = rawgpy.RAWG("Interests. Contact us via your_interests@mail.ru")
    query = request.GET.get('query', '')
    page = request.GET.get('page', 1)
    print(query, page)
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
        return Response({'Wrong slug'}, status=status.HTTP_400_BAD_REQUEST)

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
