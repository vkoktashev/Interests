from rest_framework import serializers

from movies.models import UserMovie, MovieLog, Movie
from proxy.functions import get_proxy_url
from users.serializers import FollowedUserSerializer
from utils.constants import TYPE_MOVIE
from utils.serializers import ChoicesField


class UserMovieSerializer(serializers.ModelSerializer):
    status = ChoicesField(choices=UserMovie.STATUS_CHOICES, required=False)
    movie = serializers.SerializerMethodField('get_movie')

    def get_movie(self, user_movie):
        return MovieSerializer(user_movie.movie, context={'request': self.context.get("request")}).data

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
    movie = None

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

    @staticmethod
    def get_username(movie_log):
        return movie_log.user.username

    @staticmethod
    def get_user_id(movie_log):
        return movie_log.user.id

    @staticmethod
    def get_type(movie_log):
        return TYPE_MOVIE

    @staticmethod
    def get_target(movie_log):
        return movie_log.movie.tmdb_name

    @staticmethod
    def get_target_id(movie_log):
        return movie_log.movie.tmdb_id

    class Meta:
        model = MovieLog
        exclude = ('movie',)


class MovieSerializer(serializers.ModelSerializer):
    tmdb_backdrop_path = serializers.SerializerMethodField('get_backdrop_path')
    tmdb_poster_path = serializers.SerializerMethodField('get_poster_path')

    def get_backdrop_path(self, show):
        if self.context.get('request'):
            return get_proxy_url(self.context.get('request').scheme, show.tmdb_backdrop_path)
        else:
            return show.tmdb_backdrop_path

    def get_poster_path(self, show):
        if self.context.get('request'):
            return get_proxy_url(self.context.get('request').scheme, show.tmdb_poster_path)
        else:
            return show.tmdb_poster_path

    class Meta:
        model = Movie
        exclude = ('id',)


class TypedMovieSerializer(MovieSerializer):
    type = serializers.SerializerMethodField('get_type')

    @staticmethod
    def get_type(movie):
        return TYPE_MOVIE
