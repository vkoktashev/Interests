from rest_framework import serializers

from shows.models import UserShow, UserSeason, UserEpisode, ShowLog, SeasonLog, EpisodeLog, Episode, Show, Season
from users.serializers import FollowedUserSerializer
from utils.constants import TYPE_SHOW, TYPE_SEASON, TYPE_EPISODE
from utils.serializers import ChoicesField


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
        exclude = ('id', 'user', 'episode')


class UserEpisodeInSeasonSerializer(UserEpisodeSerializer):
    tmdb_id = serializers.SerializerMethodField('get_tmdb_id')

    @staticmethod
    def get_tmdb_id(user_episode):
        return user_episode.episode.tmdb_id


class ShowStatsSerializer(UserShowSerializer):
    spent_time = serializers.DecimalField(max_digits=7, decimal_places=1)
    watched_episodes_time = serializers.IntegerField()

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


class ShowSerializer(serializers.ModelSerializer):
    class Meta:
        model = Show
        fields = '__all__'


class TypedShowSerializer(serializers.ModelSerializer):
    type = serializers.SerializerMethodField('get_type')

    @staticmethod
    def get_type(show):
        return TYPE_SHOW

    class Meta:
        model = Show
        exclude = ('id',)


class SeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Season
        fields = '__all__'


class EpisodeShowSerializer(serializers.ModelSerializer):
    tmdb_show = serializers.SerializerMethodField('get_tmdb_show')
    tmdb_season_number = serializers.SerializerMethodField('get_season_number')

    @staticmethod
    def get_tmdb_show(episode):
        return ShowSerializer(episode.tmdb_season.tmdb_show).data

    @staticmethod
    def get_season_number(episode):
        return episode.tmdb_season.tmdb_season_number

    class Meta:
        model = Episode
        exclude = ('tmdb_season',)


class EpisodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Episode
        exclude = ('tmdb_season',)
