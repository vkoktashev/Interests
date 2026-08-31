from datetime import datetime
import logging

from django.db import transaction
from django.db.models import Q

from config.celery import app
from integrations.tmdb import TmdbIntegrationError
from movies.functions import clear_tmdb_movie_cache, get_movie_new_fields, get_tmdb_movie, get_cast_crew, \
    get_tmdb_movie_release_dates, get_tmdb_movie_videos, update_movie_genres, update_movie_people
from movies.models import Movie, MovieVideo
from utils.celery import ExternalRefreshTask, enqueue_background_task_once, execute_locked_task
from utils.functions import update_fields_if_needed
from videos.functions import sync_tmdb_videos

logger = logging.getLogger(__name__)


@app.task
def update_upcoming_movies():
    today_date = datetime.today().date()

    movies = Movie.objects \
        .filter(Q(tmdb_release_date__gte=today_date) |
                Q(tmdb_release_date=None) |
                Q(tmdb_digital_release_date__gte=today_date))
    candidates_count = movies.count()
    scheduled_count = 0
    skipped_count = 0
    failed_count = 0

    logger.info('update_upcoming_movies: start today=%s candidates=%s', today_date, candidates_count)

    for movie in movies.iterator(chunk_size=200):
        if not movie.tmdb_id:
            skipped_count += 1
            logger.warning('update_upcoming_movies: skipped movie id=%s name=%s reason=empty_tmdb_id', movie.id, movie.tmdb_name)
            continue

        try:
            is_queued = enqueue_background_task_once(
                refresh_movie_details,
                identity=movie.tmdb_id,
                args=(movie.tmdb_id,),
                task_name='refresh_movie_details',
            )
            if is_queued:
                scheduled_count += 1
            else:
                skipped_count += 1
        except Exception:
            failed_count += 1
            logger.exception(
                'update_upcoming_movies: failed to enqueue movie id=%s name=%s tmdb_id=%s',
                movie.id,
                movie.tmdb_name,
                movie.tmdb_id,
            )

    logger.info(
        'update_upcoming_movies: finish candidates=%s scheduled=%s skipped=%s failed=%s',
        candidates_count,
        scheduled_count,
        skipped_count,
        failed_count,
    )
    return {
        'candidates': candidates_count,
        'scheduled': scheduled_count,
        'skipped': skipped_count,
        'errors': failed_count,
    }


@app.task(base=ExternalRefreshTask, ignore_result=True)
def refresh_movie_details(tmdb_id, force=False):
    def refresh():
        if force:
            clear_tmdb_movie_cache(tmdb_id)
        movie = update_movie_details(tmdb_id)
        return movie.id

    return execute_locked_task('refresh_movie_details', tmdb_id, refresh)


def update_movie_details(tmdb_id, movie_obj=None):
    logger.debug('update_movie_details: start tmdb_id=%s movie_id=%s', tmdb_id, getattr(movie_obj, 'id', None))

    try:
        tmdb_movie = get_tmdb_movie(tmdb_id)
        tmdb_cast_crew = get_cast_crew(tmdb_id)
        tmdb_release_dates = get_tmdb_movie_release_dates(tmdb_id)
    except TmdbIntegrationError:
        logger.exception('update_movie_details: failed to fetch TMDB details for tmdb_id=%s', tmdb_id)
        raise

    try:
        tmdb_videos = get_tmdb_movie_videos(tmdb_id)
    except TmdbIntegrationError:
        tmdb_videos = None
        logger.warning('update_movie_details: failed to fetch TMDB videos for tmdb_id=%s', tmdb_id)

    try:
        with transaction.atomic():
            new_fields = get_movie_new_fields(tmdb_movie, tmdb_release_dates)
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
            if tmdb_videos is not None:
                sync_tmdb_videos(movie_obj, MovieVideo, tmdb_videos)
    except Exception:
        logger.exception(
            'update_movie_details: failed to apply TMDB details for movie id=%s name=%s tmdb_id=%s',
            getattr(movie_obj, 'id', None),
            getattr(movie_obj, 'tmdb_name', None),
            tmdb_id,
        )
        raise

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
