from asgiref.sync import sync_to_async
from django.db import transaction

from games.models import Game, UserGame
from games.serializers import UserGameSerializer


class GameNotFoundError(Exception):
    pass


async def update_user_game(user, slug, data):
    return await sync_to_async(_update_user_game)(user, slug, data)


@transaction.atomic
def _update_user_game(user, slug, data):
    game = Game.objects.filter(igdb_slug=slug).first()
    if game is None:
        raise GameNotFoundError

    serializer_data = data.copy()
    if 'playtime' in serializer_data and 'spent_time' not in serializer_data:
        serializer_data['spent_time'] = serializer_data.pop('playtime')
    serializer_data.update({'user': user.pk, 'game': game.pk})

    user_game = UserGame.objects.filter(user=user, game=game).first()
    serializer = UserGameSerializer(user_game, data=serializer_data) \
        if user_game is not None else UserGameSerializer(data=serializer_data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return serializer.data
