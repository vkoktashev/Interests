from asgiref.sync import sync_to_async
from django.db import transaction
from django.utils import timezone

from games.models import Game, GameLog, UserGame
from games.serializers import UserGameSerializer
from utils.tracking_logs import capture_tracking_state, create_tracking_logs


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
    previous_state = capture_tracking_state(user_game, GameLog)
    serializer = UserGameSerializer(user_game, data=serializer_data) \
        if user_game is not None else UserGameSerializer(data=serializer_data)
    serializer.is_valid(raise_exception=True)
    user_game = serializer.save(updated_at=timezone.now())
    create_tracking_logs(user_game, previous_state, GameLog, 'game')
    return serializer.data
