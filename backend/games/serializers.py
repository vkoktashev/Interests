import adrf.serializers
from adrf.serializers import Serializer, ModelSerializer
from rest_framework import serializers

from games.models import UserGame, GameLog, Game
from users.serializers import FollowedUserSerializer
from utils.constants import TYPE_GAME
from utils.serializers import ChoicesField


class UserGameSerializer(ModelSerializer):
    status = ChoicesField(choices=UserGame.STATUS_CHOICES, required=False)

    class Meta:
        model = UserGame
        exclude = ('id', 'updated_at')
        extra_kwargs = {
            'user': {'write_only': True},
            'game': {'write_only': True}
        }


class GameStatsSerializer(UserGameSerializer):
    class Meta:
        model = UserGame
        exclude = ('id', 'user', 'updated_at')
        depth = 1


class FollowedUserGameSerializer(UserGameSerializer):
    user = FollowedUserSerializer()

    class Meta:
        model = UserGame
        exclude = ('id', 'game', 'updated_at')
        depth = 1


class GameLogSerializer(ModelSerializer):
    user = serializers.SerializerMethodField('get_username')
    user_id = serializers.SerializerMethodField('get_user_id')
    type = serializers.SerializerMethodField('get_type')
    target = serializers.SerializerMethodField('get_target')
    target_id = serializers.SerializerMethodField('get_target_id')

    @staticmethod
    def get_username(game_log):
        return game_log.user.username

    @staticmethod
    def get_user_id(game_log):
        return game_log.user.id

    @staticmethod
    def get_type(game_log):
        return TYPE_GAME

    @staticmethod
    def get_target(game_log):
        return game_log.game.rawg_name

    @staticmethod
    def get_target_id(game_log):
        return game_log.game.rawg_slug

    class Meta:
        model = GameLog
        exclude = ('game',)


class GameSerializer(ModelSerializer):
    class Meta:
        model = Game
        exclude = ('id',)


class TypedGameSerializer(ModelSerializer):
    type = serializers.SerializerMethodField('get_type')

    @staticmethod
    def get_type(game):
        return TYPE_GAME

    class Meta:
        model = Game
        exclude = ('id',)
