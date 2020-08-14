from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from games.models import UserGame, Game


def set_parameter(request, slug, parameter_name) -> Response:
    try:
        parameter = request.POST[parameter_name]
    except KeyError as e:
        return Response(f'Something wrong with parameters. Did you forget \'{e.args[0]}\' parameter?',
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        game = Game.objects.get(rawg_slug=slug)
    except Game.DoesNotExist:
        return Response('Game not found. Check your slug', status=status.HTTP_404_NOT_FOUND)

    try:
        user_game_score = UserGame.objects.get(user=request.user, game=game)
    except UserGame.DoesNotExist:
        return Response('UserGame not found. Check your slug', status=status.HTTP_404_NOT_FOUND)

    try:
        user_game_score.__setattr__(parameter_name, parameter)
        user_game_score.full_clean()
        user_game_score.save()
    except ValidationError as e:
        return Response(e.message_dict.items(), status=status.HTTP_400_BAD_REQUEST)

    return Response(status=status.HTTP_204_NO_CONTENT)
