from django.db import transaction
from django.utils import timezone

from movies.models import Movie, MovieLog, UserMovie
from movies.serializers import UserMovieWriteSerializer
from utils.tracking_logs import capture_tracking_state, create_tracking_logs


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
    previous_state = capture_tracking_state(user_movie, MovieLog)
    serializer = UserMovieWriteSerializer(user_movie, data=serializer_data) \
        if user_movie is not None else UserMovieWriteSerializer(data=serializer_data)
    serializer.is_valid(raise_exception=True)
    user_movie = serializer.save(updated_at=timezone.now())
    create_tracking_logs(user_movie, previous_state, MovieLog, 'movie')
    return serializer.data
