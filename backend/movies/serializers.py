from rest_framework import serializers

from movies.models import UserMovie, Movie, MovieLog
from utils.serializers import ChoicesField

TYPE_MOVIE = 'movie'


class MovieSerializer(serializers.ModelSerializer):
    class Meta:
        model = Movie
        exclude = ('id',)


class UserMovieSerializer(serializers.ModelSerializer):
    status = ChoicesField(choices=UserMovie.STATUS_CHOICES, required=False)

    class Meta:
        model = UserMovie
        exclude = ('id',)
        extra_kwargs = {
            'user': {'write_only': True},
            'movie': {'write_only': True}
        }


class ExtendedUserMovieSerializer(UserMovieSerializer):
    movie = MovieSerializer()

    class Meta:
        model = UserMovie
        exclude = ('id', 'user')


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
