from datetime import datetime
import logging

from celery.schedules import crontab
from django.db.models import Q
from requests import HTTPError, ConnectionError

from config.celery import app
from shows.functions import clear_tmdb_episode_cache, clear_tmdb_season_cache, clear_tmdb_show_cache, \
    get_show_new_fields, get_tmdb_show, get_tmdb_show_videos, sync_show_genres, \
    get_tmdb_show_credits, sync_show_people, sync_show_seasons, upsert_season_from_tmdb, get_tmdb_season, \
    sync_season_episodes, \
    get_tmdb_season_credits, sync_season_people, get_tmdb_episode, get_episode_new_fields, get_tmdb_episode_credits, \
    sync_episode_people
from shows.models import Show, UserShow, Season, Episode
from utils.constants import UPDATE_DATES_HOUR, UPDATE_DATES_MINUTE
from utils.functions import update_fields_if_needed

logger = logging.getLogger(__name__)


@app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(
        crontab(hour=UPDATE_DATES_HOUR, minute=UPDATE_DATES_MINUTE),
        update_shows.s(),
    )


@app.task
def refresh_show_details(tmdb_id, force=False):
    logger.info('refresh_show_details: start tmdb_id=%s force=%s', tmdb_id, force)
    if force:
        clear_tmdb_show_cache(tmdb_id)
    show = update_show_details(tmdb_id)
    logger.info('refresh_show_details: finish tmdb_id=%s updated=%s', tmdb_id, show is not None)
    return show.id if show is not None else None


@app.task
def refresh_season_details(show_tmdb_id, season_number, force=False):
    logger.info(
        'refresh_season_details: start show_tmdb_id=%s season_number=%s force=%s',
        show_tmdb_id,
        season_number,
        force,
    )
    if force:
        clear_tmdb_season_cache(show_tmdb_id, season_number)
    season = update_season_details(show_tmdb_id, season_number)
    logger.info(
        'refresh_season_details: finish show_tmdb_id=%s season_number=%s updated=%s',
        show_tmdb_id,
        season_number,
        season is not None,
    )
    return season.id if season is not None else None


@app.task
def refresh_episode_details(show_tmdb_id, season_number, episode_number, force=False):
    logger.info(
        'refresh_episode_details: start show_tmdb_id=%s season_number=%s episode_number=%s force=%s',
        show_tmdb_id,
        season_number,
        episode_number,
        force,
    )
    if force:
        clear_tmdb_episode_cache(show_tmdb_id, season_number, episode_number)
    episode = update_episode_details(show_tmdb_id, season_number, episode_number)
    logger.info(
        'refresh_episode_details: finish show_tmdb_id=%s season_number=%s episode_number=%s updated=%s',
        show_tmdb_id,
        season_number,
        episode_number,
        episode is not None,
    )
    return episode.id if episode is not None else None


def update_show_details(show_tmdb_id):
    logger.debug('update_show_details: start tmdb_id=%s', show_tmdb_id)

    try:
        tmdb_show = get_tmdb_show(show_tmdb_id)
        tmdb_show_videos = get_tmdb_show_videos(show_tmdb_id)
        tmdb_show_credits = get_tmdb_show_credits(show_tmdb_id)
    except (HTTPError, ConnectionError):
        logger.exception('update_show_details: failed to fetch TMDB show details for tmdb_id=%s', show_tmdb_id)
        return None

    show = None
    try:
        new_fields = get_show_new_fields(tmdb_show, tmdb_show_videos)
        show, created = Show.objects.get_or_create(tmdb_id=show_tmdb_id, defaults=new_fields)
        changed_fields = list(new_fields.keys()) if created else _get_changed_fields(show, new_fields)
        if not created:
            update_fields_if_needed(show, new_fields)

        sync_show_genres(show, tmdb_show)
        sync_show_people(show, tmdb_show_credits, tmdb_show)

        season_sync_result = sync_show_seasons(show, tmdb_show.get('seasons'))
    except Exception:
        logger.exception(
            'update_show_details: failed to apply TMDB show details for show id=%s name=%s tmdb_id=%s',
            getattr(show, 'id', None),
            getattr(show, 'tmdb_name', None),
            show_tmdb_id,
        )
        return None

    logger.debug(
        'update_show_details: refreshed show id=%s name=%s tmdb_id=%s created=%s changed_fields=%s '
        'seasons=%s deleted_seasons=%s retained_seasons=%s',
        show.id,
        show.tmdb_name,
        show.tmdb_id,
        created,
        changed_fields,
        season_sync_result['synced'],
        season_sync_result['deleted'],
        season_sync_result['retained'],
    )
    return show


def update_season_details(show_tmdb_id, season_number):
    logger.debug('update_season_details: start show_tmdb_id=%s season_number=%s', show_tmdb_id, season_number)

    show = Show.objects.filter(tmdb_id=show_tmdb_id).first()
    if show is None:
        logger.debug('update_season_details: show missing, refreshing show_tmdb_id=%s', show_tmdb_id)
        show = update_show_details(show_tmdb_id)
        if show is None:
            logger.warning(
                'update_season_details: skipped show_tmdb_id=%s season_number=%s reason=no_show',
                show_tmdb_id,
                season_number,
            )
            return None

    try:
        tmdb_season = get_tmdb_season(show_tmdb_id, season_number)
        tmdb_season_credits = get_tmdb_season_credits(show_tmdb_id, season_number)
    except (HTTPError, ConnectionError):
        logger.exception(
            'update_season_details: failed to fetch TMDB season details for show id=%s name=%s tmdb_id=%s season_number=%s',
            show.id,
            show.tmdb_name,
            show_tmdb_id,
            season_number,
        )
        return None

    try:
        season = upsert_season_from_tmdb(show, tmdb_season)
        if season is None:
            logger.warning(
                'update_season_details: skipped show id=%s name=%s tmdb_id=%s season_number=%s reason=no_season_payload',
                show.id,
                show.tmdb_name,
                show_tmdb_id,
                season_number,
            )
            return None

        episodes_count = len(tmdb_season.get('episodes') or [])
        sync_season_episodes(season, tmdb_season.get('episodes') or [])
        sync_season_people(season, tmdb_season_credits)
    except Exception:
        logger.exception(
            'update_season_details: failed to apply TMDB season details for show id=%s name=%s tmdb_id=%s season_number=%s',
            show.id,
            show.tmdb_name,
            show_tmdb_id,
            season_number,
        )
        return None

    logger.debug(
        'update_season_details: refreshed season id=%s name=%s show_id=%s show_tmdb_id=%s season_number=%s episodes=%s',
        season.id,
        season.tmdb_name,
        show.id,
        show_tmdb_id,
        season_number,
        episodes_count,
    )
    return season


def update_episode_details(show_tmdb_id, season_number, episode_number):
    logger.debug(
        'update_episode_details: start show_tmdb_id=%s season_number=%s episode_number=%s',
        show_tmdb_id,
        season_number,
        episode_number,
    )

    season = Season.objects.filter(
        tmdb_show__tmdb_id=show_tmdb_id,
        tmdb_season_number=season_number
    ).first()
    if season is None:
        logger.debug(
            'update_episode_details: season missing, refreshing show_tmdb_id=%s season_number=%s',
            show_tmdb_id,
            season_number,
        )
        season = update_season_details(show_tmdb_id, season_number)
        if season is None:
            logger.warning(
                'update_episode_details: skipped show_tmdb_id=%s season_number=%s episode_number=%s reason=no_season',
                show_tmdb_id,
                season_number,
                episode_number,
            )
            return None

    try:
        tmdb_episode = get_tmdb_episode(show_tmdb_id, season_number, episode_number)
        tmdb_episode_credits = get_tmdb_episode_credits(show_tmdb_id, season_number, episode_number)
    except (HTTPError, ConnectionError):
        logger.exception(
            'update_episode_details: failed to fetch TMDB episode details for show id=%s name=%s tmdb_id=%s season_number=%s episode_number=%s',
            season.tmdb_show.id,
            season.tmdb_show.tmdb_name,
            show_tmdb_id,
            season_number,
            episode_number,
        )
        return None

    episode = None
    try:
        defaults = get_episode_new_fields(tmdb_episode, season.id)
        episode, created = Episode.objects.get_or_create(
            tmdb_season=season,
            tmdb_episode_number=episode_number,
            defaults=defaults
        )
        changed_fields = list(defaults.keys()) if created else _get_changed_fields(episode, defaults)
        if not created:
            update_fields_if_needed(episode, defaults)

        sync_episode_people(episode, tmdb_episode_credits)
    except Exception:
        logger.exception(
            'update_episode_details: failed to apply TMDB episode details for episode id=%s show_tmdb_id=%s season_number=%s episode_number=%s',
            getattr(episode, 'id', None),
            show_tmdb_id,
            season_number,
            episode_number,
        )
        return None

    logger.debug(
        'update_episode_details: refreshed episode id=%s name=%s show_tmdb_id=%s season_number=%s episode_number=%s created=%s changed_fields=%s',
        episode.id,
        episode.tmdb_name,
        show_tmdb_id,
        season_number,
        episode_number,
        created,
        changed_fields,
    )
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
    candidates_count = shows.count()
    updated_count = 0
    skipped_count = 0
    failed_count = 0

    logger.info('update_shows: start today=%s candidates=%s', today_date, candidates_count)

    for show in shows:
        if not show.tmdb_id:
            skipped_count += 1
            logger.warning('update_shows: skipped show id=%s name=%s reason=empty_tmdb_id', show.id, show.tmdb_name)
            continue

        logger.debug(
            'update_shows: processing show id=%s name=%s tmdb_id=%s release_date=%s status=%s',
            show.id,
            show.tmdb_name,
            show.tmdb_id,
            show.tmdb_release_date,
            show.tmdb_status,
        )
        try:
            updated_show = update_show_details(show.tmdb_id)
            if updated_show is None:
                failed_count += 1
            else:
                updated_count += 1
        except Exception:
            failed_count += 1
            logger.exception('update_shows: failed show id=%s name=%s tmdb_id=%s', show.id, show.tmdb_name, show.tmdb_id)

    logger.info(
        'update_shows: finish candidates=%s updated=%s skipped=%s failed=%s',
        candidates_count,
        updated_count,
        skipped_count,
        failed_count,
    )


@app.task
def update_all_shows_task(start_index):
    for show in Show.objects.all()[start_index:]:
        update_show_details(show.tmdb_id)

        for season in show.season_set.all():
            update_season_details(show.tmdb_id, season.tmdb_season_number)


def _get_changed_fields(obj, new_fields):
    changed_fields = []
    for key, value in new_fields.items():
        if str(value) != str(getattr(obj, key)):
            changed_fields.append(key)
    return changed_fields
