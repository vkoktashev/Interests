from rest_framework import serializers

from games.models import UserGame, Game, GameLog
from users.serializers import FollowedUserSerializer
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


class GameStatsSerializer(UserGameSerializer):
    class Meta:
        model = UserGame
        exclude = ('id', 'user')
        depth = 1


class FollowedUserGameSerializer(UserGameSerializer):
    user = FollowedUserSerializer()

    class Meta:
        model = UserGame
        exclude = ('id', 'game')
        depth = 1


class GameLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameLog
        fields = '__all__'
