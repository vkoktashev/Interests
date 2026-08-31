from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from integrations.tmdb import TmdbNotFoundError, TmdbUnavailableError
from shows.functions import (
    get_show_new_fields,
    get_tmdb_show,
    get_tmdb_show_credits,
    get_tmdb_show_recommendations,
    get_tmdb_show_videos,
    sync_show_genres,
    sync_show_people,
    sync_show_seasons,
)
from shows.models import Show
from shows.tasks import refresh_show_details
from utils.celery import enqueue_background_task_once
from utils.functions import update_fields_if_needed
from videos.functions import serialize_tmdb_videos


SHOW_DETAILS_REFRESH_INTERVAL = timedelta(hours=4)


class ShowNotFoundError(Exception):
    pass


def get_show_for_detail(tmdb_id):
    show = Show.objects.filter(tmdb_id=tmdb_id).first()
    if not _show_requires_sync(show):
        return show, False

    try:
        tmdb_show = get_tmdb_show(tmdb_id)
        tmdb_show_credits = get_tmdb_show_credits(tmdb_id)
    except TmdbNotFoundError as error:
        raise ShowNotFoundError from error

    with transaction.atomic():
        new_fields = get_show_new_fields(tmdb_show)
        show, created = Show.objects.get_or_create(
            tmdb_id=tmdb_show.get('id'),
            defaults=new_fields,
        )
        if not created:
            update_fields_if_needed(show, new_fields)
        sync_show_genres(show, tmdb_show)
        sync_show_people(show, tmdb_show_credits, tmdb_show)
        sync_show_seasons(show, tmdb_show.get('seasons'))
    return show, False


def get_show_trailers(tmdb_id):
    try:
        Show.objects.get(tmdb_id=tmdb_id)
        tmdb_videos = get_tmdb_show_videos(tmdb_id)
    except Show.DoesNotExist as error:
        raise ShowNotFoundError from error
    except TmdbNotFoundError as error:
        raise ShowNotFoundError from error

    return serialize_tmdb_videos(tmdb_videos)


def get_show_recommendations(tmdb_id, page):
    try:
        return get_tmdb_show_recommendations(tmdb_id, page=page)
    except TmdbNotFoundError as error:
        raise ShowNotFoundError from error


def enqueue_show_refresh(tmdb_id):
    return enqueue_background_task_once(
        refresh_show_details,
        identity=tmdb_id,
        args=(tmdb_id,),
        task_name='refresh_show_details',
    )


def show_refresh_is_due(show):
    return bool(
        show.tmdb_last_update and
        show.tmdb_last_update <= timezone.now() - SHOW_DETAILS_REFRESH_INTERVAL
    )


def _show_requires_sync(show):
    if show is None or show.tmdb_last_update is None:
        return True

    expected_season_numbers = set(show.tmdb_season_numbers or [])
    if not expected_season_numbers:
        return False

    database_season_numbers = set(
        show.season_set.values_list('tmdb_season_number', flat=True)
    )
    return bool(expected_season_numbers - database_season_numbers)
