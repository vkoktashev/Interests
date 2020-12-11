from rest_framework import serializers

from movies.models import UserMovie, MovieLog
from users.serializers import FollowedUserSerializer
from utils.serializers import ChoicesField

TYPE_MOVIE = 'movie'


class UserMovieSerializer(serializers.ModelSerializer):
    status = ChoicesField(choices=UserMovie.STATUS_CHOICES, required=False)

    class Meta:
        model = UserMovie
        exclude = ('id', 'updated_at')
        extra_kwargs = {
            'user': {'write_only': True},
            'movie': {'write_only': True}
        }


class MovieStatsSerializer(UserMovieSerializer):
    class Meta:
        model = UserMovie
        exclude = ('id', 'user', 'updated_at')
        depth = 1


class FollowedUserMovieSerializer(UserMovieSerializer):
    user = FollowedUserSerializer()

    class Meta:
        model = UserMovie
        exclude = ('id', 'movie', 'updated_at')
        depth = 1


class MovieLogSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField('get_username')
    user_id = serializers.SerializerMethodField('get_user_id')
    type = serializers.SerializerMethodField('get_type')
    target = serializers.SerializerMethodField('get_target')
    target_id = serializers.SerializerMethodField('get_target_id')

    def get_username(self, movie_log):
        return movie_log.user.username

    def get_user_id(self, movie_log):
        return movie_log.user.id

    def get_type(self, movie_log):
        return TYPE_MOVIE

    def get_target(self, movie_log):
        return movie_log.movie.tmdb_name

    def get_target_id(self, movie_log):
        return movie_log.movie.tmdb_id

    class Meta:
        model = MovieLog
        exclude = ('movie',)
