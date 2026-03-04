from adrf.fields import SerializerMethodField
from adrf.serializers import ModelSerializer
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


class GameSerializer(ModelSerializer):
    name = SerializerMethodField('get_name')
    slug = SerializerMethodField('get_slug')
    release_date = SerializerMethodField('get_release_date')
    poster_path = SerializerMethodField('get_poster_path')
    backdrop_path = SerializerMethodField('get_backdrop_path')
    platform_score = SerializerMethodField('get_platform_score')
    platforms = SerializerMethodField('get_platforms')

    @staticmethod
    def get_name(game):
        return game.igdb_name

    @staticmethod
    def get_slug(game):
        return game.igdb_slug or ''

    @staticmethod
    def get_release_date(game):
        return game.igdb_release_date

    @staticmethod
    def get_poster_path(game):
        return game.igdb_cover_url

    @staticmethod
    def get_backdrop_path(game):
        return game.igdb_cover_url

    @staticmethod
    def get_platform_score(game):
        return game.igdb_rating or game.igdb_aggregated_rating

    @staticmethod
    def get_platforms(game):
        return game.igdb_platforms

    class Meta:
        model = Game
        fields = ('id', 'name', 'slug', 'release_date', 'poster_path', 'backdrop_path', 'platform_score', 'platforms')


class GameStatsSerializer(ModelSerializer):
    game = GameSerializer(read_only=True)
    status = ChoicesField(choices=UserGame.STATUS_CHOICES, required=False)

    class Meta:
        model = UserGame
        exclude = ('id', 'user', 'updated_at')


# todo: rework
class FollowedUserGameSerializer(UserGameSerializer):
    user = FollowedUserSerializer()
    last_updated = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = UserGame
        exclude = ('id', 'game', 'updated_at')


class GameLogSerializer(ModelSerializer):
    user = SerializerMethodField('get_username')
    user_id = SerializerMethodField('get_user_id')
    type = SerializerMethodField('get_type')
    target = SerializerMethodField('get_target')
    target_id = SerializerMethodField('get_target_id')

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
        return game_log.game.igdb_name

    @staticmethod
    def get_target_id(game_log):
        return game_log.game.igdb_slug or ''

    class Meta:
        model = GameLog
        exclude = ('game',)


class TypedGameSerializer(ModelSerializer):
    name = SerializerMethodField('get_name')
    slug = SerializerMethodField('get_slug')
    release_date = SerializerMethodField('get_release_date')
    poster_path = SerializerMethodField('get_poster_path')
    backdrop_path = SerializerMethodField('get_backdrop_path')
    platform_score = SerializerMethodField('get_platform_score')
    platforms = SerializerMethodField('get_platforms')
    type = SerializerMethodField('get_type')

    @staticmethod
    def get_name(game):
        return game.igdb_name

    @staticmethod
    def get_slug(game):
        return game.igdb_slug or ''

    @staticmethod
    def get_release_date(game):
        return game.igdb_release_date

    @staticmethod
    def get_poster_path(game):
        return game.igdb_cover_url

    @staticmethod
    def get_backdrop_path(game):
        return game.igdb_cover_url

    @staticmethod
    def get_platform_score(game):
        return game.igdb_rating or game.igdb_aggregated_rating

    @staticmethod
    def get_platforms(game):
        return game.igdb_platforms

    @staticmethod
    def get_type(game):
        return TYPE_GAME

    class Meta:
        model = Game
        fields = ('id', 'name', 'slug', 'release_date', 'poster_path', 'backdrop_path', 'platform_score', 'platforms', 'type')
