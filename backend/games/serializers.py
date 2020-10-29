from rest_framework import serializers

from games.models import UserGame, Game
from utils.serializers import ChoicesField


class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        exclude = ('id',)


class UserGameSerializer(serializers.ModelSerializer):
    status = ChoicesField(choices=UserGame.STATUS_CHOICES, required=False)

    class Meta:
        model = UserGame
        exclude = ('id',)
        extra_kwargs = {
            'user': {'write_only': True},
            'game': {'write_only': True}
        }


class ExtendedUserGameSerializer(UserGameSerializer):
    game = GameSerializer()

    class Meta:
        model = UserGame
        exclude = ('id', 'user')
