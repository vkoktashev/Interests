from django.db import transaction

from movies.models import Movie, UserMovie
from movies.serializers import UserMovieWriteSerializer


class MovieNotFoundError(Exception):
    pass


@transaction.atomic
def update_user_movie(user, tmdb_id, data):
    try:
        movie = Movie.objects.get(tmdb_id=tmdb_id)
    except Movie.DoesNotExist as error:
        raise MovieNotFoundError from error

    serializer_data = data.copy()
    serializer_data.update({'user': user.pk, 'movie': movie.pk})
    user_movie = UserMovie.objects.filter(user=user, movie=movie).first()
    serializer = UserMovieWriteSerializer(user_movie, data=serializer_data) \
        if user_movie is not None else UserMovieWriteSerializer(data=serializer_data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return serializer.data
