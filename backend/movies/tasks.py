from datetime import datetime

from celery.schedules import crontab
from django.db.models import Q
from requests import HTTPError, ConnectionError, Timeout

from config.celery import app
from movies.functions import get_movie_new_fields, get_tmdb_movie, get_cast_crew, get_tmdb_movie_videos, \
    update_movie_genres, update_movie_people
from movies.models import Movie
from utils.constants import UPDATE_DATES_HOUR, UPDATE_DATES_MINUTE
from utils.functions import update_fields_if_needed


@app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(
        crontab(hour=UPDATE_DATES_HOUR, minute=UPDATE_DATES_MINUTE),
        update_upcoming_movies.s(),
    )


@app.task
def update_upcoming_movies():
    today_date = datetime.today().date()

    movies = Movie.objects \
        .filter(Q(tmdb_release_date__gte=today_date) | Q(tmdb_release_date=None))

    for movie in movies:
        update_movie_details(movie.tmdb_id, movie)
        print(movie.tmdb_name)


@app.task
def refresh_movie_details(tmdb_id):
    update_movie_details(tmdb_id)


def update_movie_details(tmdb_id, movie_obj=None):
    try:
        tmdb_movie = get_tmdb_movie(tmdb_id)
        tmdb_cast_crew = get_cast_crew(tmdb_id)
        tmdb_movie_videos = get_tmdb_movie_videos(tmdb_id)
    except (HTTPError, ConnectionError, Timeout):
        return

    new_fields = get_movie_new_fields(tmdb_movie, tmdb_movie_videos)

    if movie_obj is None:
        movie_obj, created = Movie.objects.get_or_create(tmdb_id=tmdb_id, defaults=new_fields)
        if not created:
            update_fields_if_needed(movie_obj, new_fields)
    else:
        update_fields_if_needed(movie_obj, new_fields)

    update_movie_genres(movie_obj, tmdb_movie)
    update_movie_people(movie_obj, tmdb_cast_crew)
