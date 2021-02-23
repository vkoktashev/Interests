from datetime import datetime

import tmdbsimple as tmdb
from celery.schedules import crontab
from django.core.cache import cache
from django.db.models import Q

from config.celery import app
from movies.models import Movie
from utils.constants import CACHE_TIMEOUT, LANGUAGE, UPDATE_DATES_HOUR, UPDATE_DATES_MINUTE, TMDB_BACKDROP_PATH_PREFIX
from utils.functions import get_tmdb_movie_key, update_fields_if_needed


@app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(
        crontab(hour=UPDATE_DATES_HOUR, minute=UPDATE_DATES_MINUTE),
        update_upcoming_movies_dates.s(),
    )


@app.task
def update_upcoming_movies_dates():
    today_date = datetime.today().date()

    movies = Movie.objects \
        .filter(Q(tmdb_release_date__gte=today_date) | Q(tmdb_release_date=None))

    for movie in movies:
        tmdb_id = movie.tmdb_id
        key = get_tmdb_movie_key(tmdb_id)
        tmdb_movie = tmdb.Movies(tmdb_id).info(language=LANGUAGE)
        cache.set(key, tmdb_movie, CACHE_TIMEOUT)
        new_fields = {
            'imdb_id': tmdb_movie.get('imdb_id'),
            'tmdb_original_name': tmdb_movie.get('original_title'),
            'tmdb_name': tmdb_movie.get('title'),
            'tmdb_runtime': tmdb_movie.get('runtime'),
            'tmdb_release_date': tmdb_movie.get('release_date') if tmdb_movie.get('release_date') != "" else None,
            'tmdb_backdrop_path': TMDB_BACKDROP_PATH_PREFIX + tmdb_movie.get('backdrop_path')
            if tmdb_movie.get('backdrop_path') else ''
        }
        update_fields_if_needed(movie, new_fields)
        print(movie.tmdb_name)
