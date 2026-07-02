from datetime import datetime
import logging

from celery.schedules import crontab
from django.db.models import Q
from requests import HTTPError, ConnectionError, Timeout

from config.celery import app
from movies.functions import clear_tmdb_movie_cache, get_movie_new_fields, get_tmdb_movie, get_cast_crew, get_tmdb_movie_videos, \
    get_tmdb_movie_release_dates, update_movie_genres, update_movie_people
from movies.models import Movie
from utils.constants import UPDATE_DATES_HOUR, UPDATE_DATES_MINUTE
from utils.functions import update_fields_if_needed

logger = logging.getLogger(__name__)


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
        .filter(Q(tmdb_release_date__gte=today_date) |
                Q(tmdb_release_date=None) |
                Q(tmdb_digital_release_date__gte=today_date))
    candidates_count = movies.count()
    updated_count = 0
    skipped_count = 0
    failed_count = 0

    logger.info('update_upcoming_movies: start today=%s candidates=%s', today_date, candidates_count)

    for movie in movies:
        if not movie.tmdb_id:
            skipped_count += 1
            logger.warning('update_upcoming_movies: skipped movie id=%s name=%s reason=empty_tmdb_id', movie.id, movie.tmdb_name)
            continue

        logger.debug(
            'update_upcoming_movies: processing movie id=%s name=%s tmdb_id=%s release_date=%s digital_release_date=%s',
            movie.id,
            movie.tmdb_name,
            movie.tmdb_id,
            movie.tmdb_release_date,
            movie.tmdb_digital_release_date,
        )
        try:
            updated_movie = update_movie_details(movie.tmdb_id, movie)
            if updated_movie is None:
                failed_count += 1
            else:
                updated_count += 1
        except Exception:
            failed_count += 1
            logger.exception(
                'update_upcoming_movies: failed movie id=%s name=%s tmdb_id=%s',
                movie.id,
                movie.tmdb_name,
                movie.tmdb_id,
            )

    logger.info(
        'update_upcoming_movies: finish candidates=%s updated=%s skipped=%s failed=%s',
        candidates_count,
        updated_count,
        skipped_count,
        failed_count,
    )


@app.task
def refresh_movie_details(tmdb_id, force=False):
    logger.info('refresh_movie_details: start tmdb_id=%s force=%s', tmdb_id, force)
    if force:
        clear_tmdb_movie_cache(tmdb_id)
    movie = update_movie_details(tmdb_id)
    logger.info('refresh_movie_details: finish tmdb_id=%s updated=%s', tmdb_id, movie is not None)
    return movie.id if movie is not None else None


def update_movie_details(tmdb_id, movie_obj=None):
    logger.debug('update_movie_details: start tmdb_id=%s movie_id=%s', tmdb_id, getattr(movie_obj, 'id', None))

    try:
        tmdb_movie = get_tmdb_movie(tmdb_id)
        tmdb_cast_crew = get_cast_crew(tmdb_id)
        tmdb_movie_videos = get_tmdb_movie_videos(tmdb_id)
        tmdb_release_dates = get_tmdb_movie_release_dates(tmdb_id)
    except (HTTPError, ConnectionError, Timeout):
        logger.exception('update_movie_details: failed to fetch TMDB details for tmdb_id=%s', tmdb_id)
        return

    try:
        new_fields = get_movie_new_fields(tmdb_movie, tmdb_movie_videos, tmdb_release_dates)
        if movie_obj is None:
            movie_obj, created = Movie.objects.get_or_create(tmdb_id=tmdb_id, defaults=new_fields)
            changed_fields = list(new_fields.keys()) if created else _get_changed_fields(movie_obj, new_fields)
            if not created:
                update_fields_if_needed(movie_obj, new_fields)
        else:
            created = False
            changed_fields = _get_changed_fields(movie_obj, new_fields)
            update_fields_if_needed(movie_obj, new_fields)

        update_movie_genres(movie_obj, tmdb_movie)
        update_movie_people(movie_obj, tmdb_cast_crew)
    except Exception:
        logger.exception(
            'update_movie_details: failed to apply TMDB details for movie id=%s name=%s tmdb_id=%s',
            getattr(movie_obj, 'id', None),
            getattr(movie_obj, 'tmdb_name', None),
            tmdb_id,
        )
        return None

    logger.debug(
        'update_movie_details: refreshed movie id=%s name=%s tmdb_id=%s created=%s changed_fields=%s',
        movie_obj.id,
        movie_obj.tmdb_name,
        movie_obj.tmdb_id,
        created,
        changed_fields,
    )
    return movie_obj


def _get_changed_fields(obj, new_fields):
    changed_fields = []
    for key, value in new_fields.items():
        if str(value) != str(getattr(obj, key)):
            changed_fields.append(key)
    return changed_fields
