from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from integrations.tmdb import TmdbNotFoundError, TmdbUnavailableError
from movies.functions import (
    get_cast_crew,
    get_movie_new_fields,
    get_tmdb_movie,
    get_tmdb_movie_recommendations,
    get_tmdb_movie_release_dates,
    get_tmdb_movie_videos,
    update_movie_genres,
    update_movie_people,
)
from movies.models import Movie
from movies.tasks import refresh_movie_details
from utils.celery import enqueue_background_task_once
from utils.functions import update_fields_if_needed
from videos.functions import serialize_tmdb_videos


MOVIE_DETAILS_REFRESH_INTERVAL = timedelta(days=7)


class MovieNotFoundError(Exception):
    pass


def get_movie_for_detail(tmdb_id):
    movie = Movie.objects.filter(tmdb_id=tmdb_id).first()
    if movie is not None and movie.tmdb_last_update is not None:
        return movie, False

    try:
        tmdb_movie = get_tmdb_movie(tmdb_id)
        tmdb_cast_crew = get_cast_crew(tmdb_id)
        tmdb_release_dates = get_tmdb_movie_release_dates(tmdb_id)
    except TmdbNotFoundError as error:
        raise MovieNotFoundError from error

    with transaction.atomic():
        new_fields = get_movie_new_fields(tmdb_movie, tmdb_release_dates)
        movie, created = Movie.objects.get_or_create(
            tmdb_id=tmdb_movie.get('id'),
            defaults=new_fields,
        )
        if not created:
            update_fields_if_needed(movie, new_fields)
        update_movie_genres(movie, tmdb_movie)
        update_movie_people(movie, tmdb_cast_crew)
    return movie, False


def get_movie_trailers(tmdb_id):
    try:
        Movie.objects.get(tmdb_id=tmdb_id)
        tmdb_videos = get_tmdb_movie_videos(tmdb_id)
    except Movie.DoesNotExist as error:
        raise MovieNotFoundError from error
    except TmdbNotFoundError as error:
        raise MovieNotFoundError from error

    return serialize_tmdb_videos(tmdb_videos)


def get_movie_recommendations(tmdb_id, page):
    try:
        return get_tmdb_movie_recommendations(tmdb_id, page=page)
    except TmdbNotFoundError as error:
        raise MovieNotFoundError from error


def enqueue_movie_refresh(tmdb_id):
    return enqueue_background_task_once(
        refresh_movie_details,
        identity=tmdb_id,
        args=(tmdb_id,),
        task_name='refresh_movie_details',
    )


def movie_refresh_is_due(movie):
    return bool(
        movie.tmdb_last_update and
        movie.tmdb_last_update <= timezone.now() - MOVIE_DETAILS_REFRESH_INTERVAL
    )
