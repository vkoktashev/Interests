from rest_framework import serializers

from movies.models import UserMovie, Movie
from utils.serializers import ChoicesField


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
