from datetime import datetime

from celery.schedules import crontab
from django.db.models import Q
from requests import HTTPError, ConnectionError

from config.celery import app
from shows.functions import get_show_new_fields, get_tmdb_show, get_tmdb_show_videos, sync_show_genres, \
    get_tmdb_show_credits, sync_show_people, upsert_season_from_tmdb, get_tmdb_season, sync_season_episodes, \
    get_tmdb_season_credits, sync_season_people, get_tmdb_episode, get_episode_new_fields, get_tmdb_episode_credits, \
    sync_episode_people
from shows.models import Show, UserShow, Season, Episode
from utils.constants import UPDATE_DATES_HOUR, UPDATE_DATES_MINUTE
from utils.functions import update_fields_if_needed


@app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(
        crontab(hour=UPDATE_DATES_HOUR, minute=UPDATE_DATES_MINUTE),
        update_shows.s(),
    )


@app.task
def refresh_show_details(tmdb_id):
    update_show_details(tmdb_id)


@app.task
def refresh_season_details(show_tmdb_id, season_number):
    update_season_details(show_tmdb_id, season_number)


@app.task
def refresh_episode_details(show_tmdb_id, season_number, episode_number):
    update_episode_details(show_tmdb_id, season_number, episode_number)


def update_show_details(show_tmdb_id):
    try:
        tmdb_show = get_tmdb_show(show_tmdb_id)
        tmdb_show_videos = get_tmdb_show_videos(show_tmdb_id)
        tmdb_show_credits = get_tmdb_show_credits(show_tmdb_id)
    except (HTTPError, ConnectionError):
        return None

    new_fields = get_show_new_fields(tmdb_show, tmdb_show_videos)
    show, created = Show.objects.get_or_create(tmdb_id=show_tmdb_id, defaults=new_fields)
    if not created:
        update_fields_if_needed(show, new_fields)

    sync_show_genres(show, tmdb_show)
    sync_show_people(show, tmdb_show_credits)

    for tmdb_season in tmdb_show.get('seasons') or []:
        upsert_season_from_tmdb(show, tmdb_season)

    return show


def update_season_details(show_tmdb_id, season_number):
    show = Show.objects.filter(tmdb_id=show_tmdb_id).first()
    if show is None:
        show = update_show_details(show_tmdb_id)
        if show is None:
            return None

    try:
        tmdb_season = get_tmdb_season(show_tmdb_id, season_number)
        tmdb_season_credits = get_tmdb_season_credits(show_tmdb_id, season_number)
    except (HTTPError, ConnectionError):
        return None

    season = upsert_season_from_tmdb(show, tmdb_season)
    if season is None:
        return None

    sync_season_episodes(season, tmdb_season.get('episodes') or [])
    sync_season_people(season, tmdb_season_credits)
    return season


def update_episode_details(show_tmdb_id, season_number, episode_number):
    season = Season.objects.filter(
        tmdb_show__tmdb_id=show_tmdb_id,
        tmdb_season_number=season_number
    ).first()
    if season is None:
        season = update_season_details(show_tmdb_id, season_number)
        if season is None:
            return None

    try:
        tmdb_episode = get_tmdb_episode(show_tmdb_id, season_number, episode_number)
        tmdb_episode_credits = get_tmdb_episode_credits(show_tmdb_id, season_number, episode_number)
    except (HTTPError, ConnectionError):
        return None

    defaults = get_episode_new_fields(tmdb_episode, season.id)
    episode, created = Episode.objects.get_or_create(
        tmdb_season=season,
        tmdb_episode_number=episode_number,
        defaults=defaults
    )
    if not created:
        update_fields_if_needed(episode, defaults)

    sync_episode_people(episode, tmdb_episode_credits)
    return episode


@app.task
def update_shows():
    today_date = datetime.today().date()

    accepted_statuses = (
        Show.TMDB_STATUS_PILOT, Show.TMDB_STATUS_PLANNED,
        Show.TMDB_STATUS_IN_PRODUCTION, Show.TMDB_STATUS_RETURNING_SERIES
    )

    shows = Show.objects.filter(
        ((Q(usershow__status=UserShow.STATUS_WATCHING) |
          Q(usershow__status=UserShow.STATUS_WATCHED)) &
         (Q(tmdb_status='') | Q(tmdb_status__in=accepted_statuses))) |
        Q(tmdb_release_date__gte=today_date) | Q(tmdb_release_date=None)
    ).distinct()

    for show in shows:
        update_show_details(show.tmdb_id)


@app.task
def update_all_shows_task(start_index):
    for show in Show.objects.all()[start_index:]:
        update_show_details(show.tmdb_id)

        for season in show.season_set.all():
            update_season_details(show.tmdb_id, season.tmdb_season_number)
