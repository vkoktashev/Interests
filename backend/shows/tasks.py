from datetime import datetime, timedelta
import logging

from django.db import transaction
from django.db.models import Q

from config.celery import app
from integrations.tmdb import TmdbIntegrationError
from shows.functions import clear_tmdb_episode_cache, clear_tmdb_season_cache, clear_tmdb_show_cache, \
    get_show_new_fields, get_tmdb_show, sync_show_genres, \
    get_tmdb_show_credits, sync_show_people, sync_show_seasons, upsert_season_from_tmdb, get_tmdb_season, \
    get_tmdb_show_videos, get_tmdb_season_videos, get_tmdb_episode_videos, sync_season_episodes, \
    get_tmdb_season_credits, sync_season_people, get_tmdb_episode, get_episode_new_fields, get_tmdb_episode_credits, \
    sync_episode_people, get_tmdb_changed_show_ids, get_tmdb_show_status
from shows.models import Episode, EpisodeVideo, Season, SeasonVideo, Show, ShowChangesSyncState, ShowStatusChange, \
    ShowVideo, UserShow
from shows.services.cast_sync import run_show_cast_sync
from utils.celery import ExternalRefreshTask, enqueue_background_task_once, execute_locked_task
from utils.functions import update_fields_if_needed
from videos.functions import sync_tmdb_videos

logger = logging.getLogger(__name__)

SHOW_CHANGES_SOURCE_TMDB = 'tmdb'
SHOW_CHANGES_MAX_LOOKBACK_DAYS = 13
TRACKED_SHOW_STATUSES = (
    UserShow.STATUS_GOING,
    UserShow.STATUS_WATCHING,
    UserShow.STATUS_WATCHED,
)


@app.task(bind=True, track_started=True)
def sync_show_cast(self):
    def report_progress(progress):
        try:
            self.update_state(state='PROGRESS', meta=progress)
        except Exception:
            logger.exception('sync_show_cast: failed to report progress')

    def log_output(level, message):
        log_method = logger.error if level == 'error' else logger.info
        log_method('sync_show_cast: %s', message)

    def sync_cast():
        return run_show_cast_sync(
            progress_callback=report_progress,
            output_callback=log_output,
        )

    return execute_locked_task('sync_show_cast', 'all', sync_cast, timeout=60 * 60 * 12)


@app.task(base=ExternalRefreshTask, ignore_result=True)
def refresh_show_details(tmdb_id, force=False):
    def refresh():
        if force:
            clear_tmdb_show_cache(tmdb_id)
        return update_show_details(tmdb_id).id

    return execute_locked_task('refresh_show_details', tmdb_id, refresh)


@app.task(base=ExternalRefreshTask, ignore_result=True)
def refresh_season_details(show_tmdb_id, season_number, force=False):
    identity = f'{show_tmdb_id}:{season_number}'

    def refresh():
        if force:
            clear_tmdb_season_cache(show_tmdb_id, season_number)
        season = update_season_details(show_tmdb_id, season_number)
        return season.id if season is not None else None

    return execute_locked_task(
        'refresh_season_details',
        identity,
        refresh,
    )


@app.task(base=ExternalRefreshTask, ignore_result=True)
def refresh_episode_details(show_tmdb_id, season_number, episode_number, force=False):
    identity = f'{show_tmdb_id}:{season_number}:{episode_number}'

    def refresh():
        if force:
            clear_tmdb_episode_cache(show_tmdb_id, season_number, episode_number)
        episode = update_episode_details(show_tmdb_id, season_number, episode_number)
        return episode.id if episode is not None else None

    return execute_locked_task(
        'refresh_episode_details',
        identity,
        refresh,
    )


def update_show_details(show_tmdb_id):
    logger.debug('update_show_details: start tmdb_id=%s', show_tmdb_id)

    try:
        tmdb_show = get_tmdb_show(show_tmdb_id)
        tmdb_show_credits = get_tmdb_show_credits(show_tmdb_id)
    except TmdbIntegrationError:
        logger.exception('update_show_details: failed to fetch TMDB show details for tmdb_id=%s', show_tmdb_id)
        raise

    try:
        tmdb_videos = get_tmdb_show_videos(show_tmdb_id)
    except TmdbIntegrationError:
        tmdb_videos = None
        logger.warning('update_show_details: failed to fetch TMDB videos for tmdb_id=%s', show_tmdb_id)

    show = None
    try:
        with transaction.atomic():
            new_fields = get_show_new_fields(tmdb_show)
            show, created = Show.objects.get_or_create(tmdb_id=show_tmdb_id, defaults=new_fields)
            if created:
                changed_fields = list(new_fields.keys())
            else:
                show = Show.objects.select_for_update().get(pk=show.pk)
                changed_fields = _get_changed_fields(show, new_fields)
                old_status = show.tmdb_status
                update_fields_if_needed(show, new_fields)
                _create_show_status_change(show, old_status, show.tmdb_status)

            sync_show_genres(show, tmdb_show)
            sync_show_people(show, tmdb_show_credits, tmdb_show)
            if tmdb_videos is not None:
                sync_tmdb_videos(show, ShowVideo, tmdb_videos)

            season_sync_result = sync_show_seasons(show, tmdb_show.get('seasons'))
    except Exception:
        logger.exception(
            'update_show_details: failed to apply TMDB show details for show id=%s name=%s tmdb_id=%s',
            getattr(show, 'id', None),
            getattr(show, 'tmdb_name', None),
            show_tmdb_id,
        )
        raise

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
    except TmdbIntegrationError:
        logger.exception(
            'update_season_details: failed to fetch TMDB season details for show id=%s name=%s tmdb_id=%s season_number=%s',
            show.id,
            show.tmdb_name,
            show_tmdb_id,
            season_number,
        )
        raise
    try:
        tmdb_videos = get_tmdb_season_videos(show_tmdb_id, season_number)
    except TmdbIntegrationError:
        tmdb_videos = None
        logger.warning(
            'update_season_details: failed to fetch TMDB videos for show_tmdb_id=%s season_number=%s',
            show_tmdb_id,
            season_number,
        )

    try:
        with transaction.atomic():
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
            if tmdb_videos is not None:
                sync_tmdb_videos(season, SeasonVideo, tmdb_videos)
    except Exception:
        logger.exception(
            'update_season_details: failed to apply TMDB season details for show id=%s name=%s tmdb_id=%s season_number=%s',
            show.id,
            show.tmdb_name,
            show_tmdb_id,
            season_number,
        )
        raise

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
    except TmdbIntegrationError:
        logger.exception(
            'update_episode_details: failed to fetch TMDB episode details for show id=%s name=%s tmdb_id=%s season_number=%s episode_number=%s',
            season.tmdb_show.id,
            season.tmdb_show.tmdb_name,
            show_tmdb_id,
            season_number,
            episode_number,
        )
        raise
    try:
        tmdb_videos = get_tmdb_episode_videos(show_tmdb_id, season_number, episode_number)
    except TmdbIntegrationError:
        tmdb_videos = None
        logger.warning(
            'update_episode_details: failed to fetch TMDB videos for show_tmdb_id=%s season_number=%s '
            'episode_number=%s',
            show_tmdb_id,
            season_number,
            episode_number,
        )

    episode = None
    try:
        with transaction.atomic():
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
            if tmdb_videos is not None:
                sync_tmdb_videos(episode, EpisodeVideo, tmdb_videos)
    except Exception:
        logger.exception(
            'update_episode_details: failed to apply TMDB episode details for episode id=%s show_tmdb_id=%s season_number=%s episode_number=%s',
            getattr(episode, 'id', None),
            show_tmdb_id,
            season_number,
            episode_number,
        )
        raise

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


def sync_show_status_changes(today_date):
    sync_state, _ = ShowChangesSyncState.objects.get_or_create(
        source=SHOW_CHANGES_SOURCE_TMDB,
    )
    tracked_show_ids = set(
        Show.objects.filter(
            usershow__user__receive_show_status_changes=True,
            usershow__status__in=TRACKED_SHOW_STATUSES,
        ).values_list('tmdb_id', flat=True).distinct()
    )
    last_successful_date = sync_state.last_successful_date
    oldest_supported_date = today_date - timedelta(days=SHOW_CHANGES_MAX_LOOKBACK_DAYS)
    requires_full_recovery = bool(
        last_successful_date and last_successful_date < oldest_supported_date
    )
    pages_count = 0
    total_pages_count = 0
    used_direct_check = requires_full_recovery

    if requires_full_recovery:
        changed_tracked_ids = tracked_show_ids
    elif tracked_show_ids:
        previous_date = last_successful_date or today_date - timedelta(days=1)
        start_date = max(previous_date, oldest_supported_date)
        changed_show_ids, pages_count, total_pages_count = get_tmdb_changed_show_ids(
            start_date,
            today_date,
            max_pages=len(tracked_show_ids),
        )
        if changed_show_ids is None:
            changed_tracked_ids = tracked_show_ids
            used_direct_check = True
        else:
            changed_tracked_ids = tracked_show_ids.intersection(changed_show_ids)
    else:
        changed_tracked_ids = set()

    checked_count = 0
    updated_count = 0
    events_count = 0
    failed_count = 0
    for show in Show.objects.filter(tmdb_id__in=changed_tracked_ids).order_by('tmdb_id'):
        try:
            new_status = get_tmdb_show_status(show.tmdb_id)
            status_updated, event_created = _update_show_status(show, new_status)
        except Exception:
            failed_count += 1
            logger.exception(
                'sync_show_status_changes: failed show_id=%s tmdb_id=%s',
                show.id,
                show.tmdb_id,
            )
            continue

        checked_count += 1
        if status_updated:
            updated_count += 1
        if event_created:
            events_count += 1

    if failed_count == 0:
        sync_state.last_successful_date = today_date
        sync_state.save(update_fields=('last_successful_date',))

    logger.info(
        'sync_show_status_changes: finish tracked=%s pages=%s total_pages=%s checked=%s updated=%s events=%s errors=%s recovery=%s direct=%s',
        len(tracked_show_ids),
        pages_count,
        total_pages_count,
        checked_count,
        updated_count,
        events_count,
        failed_count,
        requires_full_recovery,
        used_direct_check,
    )
    return {
        'tracked': len(tracked_show_ids),
        'pages': pages_count,
        'total_pages': total_pages_count,
        'checked': checked_count,
        'updated': updated_count,
        'events': events_count,
        'errors': failed_count,
        'recovery': requires_full_recovery,
        'direct': used_direct_check,
    }


@app.task
def update_shows():
    today_date = datetime.today().date()

    try:
        status_changes_result = sync_show_status_changes(today_date)
    except Exception:
        logger.exception('update_shows: failed to sync TMDB show changes')
        status_changes_result = {
            'tracked': 0,
            'pages': 0,
            'total_pages': 0,
            'checked': 0,
            'updated': 0,
            'events': 0,
            'errors': 1,
            'recovery': False,
            'direct': False,
        }

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
    scheduled_count = 0
    skipped_count = 0
    failed_count = status_changes_result['errors']

    logger.info('update_shows: start today=%s candidates=%s', today_date, candidates_count)

    for show in shows.iterator(chunk_size=200):
        if not show.tmdb_id:
            skipped_count += 1
            logger.warning('update_shows: skipped show id=%s name=%s reason=empty_tmdb_id', show.id, show.tmdb_name)
            continue

        try:
            is_queued = enqueue_background_task_once(
                refresh_show_details,
                identity=show.tmdb_id,
                args=(show.tmdb_id,),
                task_name='refresh_show_details',
            )
            if is_queued:
                scheduled_count += 1
            else:
                skipped_count += 1
        except Exception:
            failed_count += 1
            logger.exception(
                'update_shows: failed to enqueue show id=%s name=%s tmdb_id=%s',
                show.id,
                show.tmdb_name,
                show.tmdb_id,
            )

    logger.info(
        'update_shows: finish candidates=%s scheduled=%s skipped=%s failed=%s',
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
        'status_changes': status_changes_result,
    }


@app.task
def update_all_shows_task(start_index):
    scheduled_count = 0
    skipped_count = 0
    shows = Show.objects.order_by('id')[start_index:].prefetch_related('season_set')
    for show in shows.iterator(chunk_size=100):
        if not show.tmdb_id:
            skipped_count += 1
            continue

        if enqueue_background_task_once(
                refresh_show_details,
                identity=show.tmdb_id,
                args=(show.tmdb_id,),
                task_name='refresh_show_details',
        ):
            scheduled_count += 1
        else:
            skipped_count += 1

        for season in show.season_set.all():
            identity = f'{show.tmdb_id}:{season.tmdb_season_number}'
            if enqueue_background_task_once(
                    refresh_season_details,
                    identity=identity,
                    args=(show.tmdb_id, season.tmdb_season_number),
                    task_name='refresh_season_details',
            ):
                scheduled_count += 1
            else:
                skipped_count += 1

    return {
        'scheduled': scheduled_count,
        'skipped': skipped_count,
        'errors': 0,
    }


def _get_changed_fields(obj, new_fields):
    changed_fields = []
    for key, value in new_fields.items():
        if str(value) != str(getattr(obj, key)):
            changed_fields.append(key)
    return changed_fields


def _update_show_status(show, new_status):
    with transaction.atomic():
        locked_show = Show.objects.select_for_update().get(pk=show.pk)
        old_status = locked_show.tmdb_status
        if old_status == new_status:
            return False, False

        locked_show.tmdb_status = new_status
        locked_show.save(update_fields=('tmdb_status',))
        event_created = _create_show_status_change(locked_show, old_status, new_status)
        return True, event_created


def _create_show_status_change(show, old_status, new_status):
    if not old_status or not new_status or old_status == new_status:
        return False

    ShowStatusChange.objects.create(
        show=show,
        old_status=old_status,
        new_status=new_status,
    )
    return True
