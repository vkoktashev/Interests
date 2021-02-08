from rest_framework import serializers

from shows.models import UserShow, UserSeason, UserEpisode, ShowLog, SeasonLog, EpisodeLog, Episode
from users.serializers import FollowedUserSerializer
from utils.serializers import ChoicesField

TYPE_SHOW = 'show'
TYPE_SEASON = 'season'
TYPE_EPISODE = 'episode'


class UserShowSerializer(serializers.ModelSerializer):
    status = ChoicesField(choices=UserShow.STATUS_CHOICES, required=False)

    class Meta:
        model = UserShow
        exclude = ('id', 'updated_at')
        extra_kwargs = {
            'user': {'write_only': True},
            'show': {'write_only': True}
        }


class UserSeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSeason
        exclude = ('id',)
        extra_kwargs = {
            'user': {'write_only': True},
            'season': {'write_only': True}
        }


class UserEpisodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserEpisode
        exclude = ('id',)
        extra_kwargs = {
            'user': {'write_only': True},
            'episode': {'write_only': True}
        }


class UserEpisodeInSeasonSerializer(UserEpisodeSerializer):
    episode_number = serializers.SerializerMethodField('get_episode_number')

    @staticmethod
    def get_episode_number(user_episode):
        return user_episode.episode.tmdb_episode_number


class ShowStatsSerializer(UserShowSerializer):
    spent_time = serializers.DecimalField(max_digits=7, decimal_places=1)

    class Meta:
        model = UserShow
        exclude = ('id', 'user', 'updated_at')
        depth = 1


class ShowLogSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField('get_username')
    user_id = serializers.SerializerMethodField('get_user_id')
    type = serializers.SerializerMethodField('get_type')
    target = serializers.SerializerMethodField('get_target')
    target_id = serializers.SerializerMethodField('get_target_id')

    @staticmethod
    def get_username(show_log):
        return show_log.user.username

    @staticmethod
    def get_user_id(show_log):
        return show_log.user.id

    @staticmethod
    def get_type(show_log):
        return TYPE_SHOW

    @staticmethod
    def get_target(show_log):
        return show_log.show.tmdb_name

    @staticmethod
    def get_target_id(show_log):
        return show_log.show.tmdb_id

    class Meta:
        model = ShowLog
        exclude = ('show',)


class SeasonLogSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField('get_username')
    user_id = serializers.SerializerMethodField('get_user_id')
    type = serializers.SerializerMethodField('get_type')
    target = serializers.SerializerMethodField('get_target')
    target_id = serializers.SerializerMethodField('get_target_id')

    @staticmethod
    def get_username(season_log):
        return season_log.user.username

    @staticmethod
    def get_user_id(season_log):
        return season_log.user.id

    @staticmethod
    def get_type(season_log):
        return TYPE_SEASON

    @staticmethod
    def get_target(season_log):
        return {'name': season_log.season.tmdb_name,
                'parent_name': season_log.season.tmdb_show.tmdb_name}

    @staticmethod
    def get_target_id(season_log):
        return {'show_id': season_log.season.tmdb_show.tmdb_id,
                'season_number': season_log.season.tmdb_season_number}

    class Meta:
        model = SeasonLog
        exclude = ('season',)


class EpisodeLogSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField('get_username')
    user_id = serializers.SerializerMethodField('get_user_id')
    type = serializers.SerializerMethodField('get_type')
    target = serializers.SerializerMethodField('get_target')
    target_id = serializers.SerializerMethodField('get_target_id')

    @staticmethod
    def get_username(episode_log):
        return episode_log.user.username

    @staticmethod
    def get_user_id(episode_log):
        return episode_log.user.id

    @staticmethod
    def get_type(episode_log):
        return TYPE_EPISODE

    @staticmethod
    def get_target(episode_log):
        return {'name': episode_log.episode.tmdb_name,
                'parent_name': episode_log.episode.tmdb_season.tmdb_show.tmdb_name}

    @staticmethod
    def get_target_id(episode_log):
        return {'show_id': episode_log.episode.tmdb_season.tmdb_show.tmdb_id,
                'season_number': episode_log.episode.tmdb_season.tmdb_season_number,
                'episode_number': episode_log.episode.tmdb_episode_number}

    class Meta:
        model = EpisodeLog
        exclude = ('episode',)


class FollowedUserShowSerializer(UserShowSerializer):
    user = FollowedUserSerializer()

    class Meta:
        model = UserShow
        exclude = ('id', 'show', 'updated_at')
        depth = 1


class FollowedUserSeasonSerializer(UserSeasonSerializer):
    user = FollowedUserSerializer()

    class Meta:
        model = UserSeason
        exclude = ('id', 'season')
        depth = 1


class FollowedUserEpisodeSerializer(UserEpisodeSerializer):
    user = FollowedUserSerializer()

    class Meta:
        model = UserEpisode
        exclude = ('id', 'episode')
        depth = 1


class EpisodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Episode
        fields = '__all__'
        depth = 1
