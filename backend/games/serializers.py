from rest_framework import serializers

from games.models import UserGame, GameLog
from users.serializers import FollowedUserSerializer
from utils.serializers import ChoicesField

TYPE_GAME = 'game'


class UserGameSerializer(serializers.ModelSerializer):
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


class GameLogSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField('get_username')
    user_id = serializers.SerializerMethodField('get_user_id')
    type = serializers.SerializerMethodField('get_type')
    target = serializers.SerializerMethodField('get_target')
    target_id = serializers.SerializerMethodField('get_target_id')

    def get_username(self, game_log):
        return game_log.user.username

    def get_user_id(self, game_log):
        return game_log.user.id

    def get_type(self, game_log):
        return TYPE_GAME

    def get_target(self, game_log):
        return game_log.game.rawg_name

    def get_target_id(self, game_log):
        return game_log.game.rawg_slug

    class Meta:
        model = GameLog
        exclude = ('game',)
