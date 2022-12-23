from datetime import datetime

import tmdbsimple as tmdb
from celery.schedules import crontab
from django.core.cache import cache
from django.db.models import Q
from requests import HTTPError

from config.celery import app
from shows.functions import get_show_new_fields, get_season_new_fields, get_tmdb_show_key, \
    get_tmdb_season_key, get_episodes_to_create_update_delete
from shows.models import Show, Episode, UserShow, Season
from utils.constants import LANGUAGE, CACHE_TIMEOUT, UPDATE_DATES_HOUR, UPDATE_DATES_MINUTE
from utils.functions import update_fields_if_needed


@app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(
        crontab(hour=UPDATE_DATES_HOUR, minute=UPDATE_DATES_MINUTE),
        update_shows.s(),
    )


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

    episodes_to_create = []
    episodes_to_update = []
    episodes_to_delete_pks = []

    for show in shows:
        show_tmdb_id = show.tmdb_id
        current_number_of_episodes = show.tmdb_number_of_episodes
        key = get_tmdb_show_key(show_tmdb_id)
        try:
            tmdb_show = tmdb.TV(show_tmdb_id).info(language=LANGUAGE)
        except HTTPError:
            continue
        cache.set(key, tmdb_show, CACHE_TIMEOUT)

        new_fields = get_show_new_fields(tmdb_show)

        update_fields_if_needed(show, new_fields)
        print(show.tmdb_name)

        if current_number_of_episodes != show.tmdb_number_of_episodes:
            season_number = tmdb_show.get('seasons')[-1]['season_number']
            key = get_tmdb_season_key(show_tmdb_id, season_number)

            try:
                tmdb_season = tmdb.TV_Seasons(show_tmdb_id, season_number).info(language=LANGUAGE)
            except HTTPError:
                continue
            cache.set(key, tmdb_season, CACHE_TIMEOUT)

            new_fields = get_season_new_fields(tmdb_season, show.id)
            season, created = Season.objects.get_or_create(tmdb_id=tmdb_season.get('id'),
                                                           defaults=new_fields)
            if not created:
                update_fields_if_needed(season, new_fields)

            print(season.tmdb_name, season.id)

            episodes = tmdb_season.get('episodes')
            existed_episodes = Episode.objects.select_related('tmdb_season').filter(tmdb_season=season)

            temp1, temp2, temp3 = get_episodes_to_create_update_delete(existed_episodes, episodes, season.id)
            episodes_to_create += temp1
            episodes_to_update += temp2
            episodes_to_delete_pks += temp3

    Episode.objects.filter(pk__in=episodes_to_delete_pks).delete()
    Episode.objects.bulk_update(episodes_to_update,
                                ['tmdb_episode_number', 'tmdb_season', 'tmdb_name', 'tmdb_release_date'])
    Episode.objects.bulk_create(episodes_to_create)


@app.task
def update_all_shows_task(start_index):
    shows = Show.objects.all()[start_index:]
    count = len(shows)
    i = 1

    for show in shows:
        episodes_to_create = []
        episodes_to_update = []
        episodes_to_delete_pks = []

        tmdb_show_id = show.tmdb_id
        key = get_tmdb_show_key(tmdb_show_id)
        try:
            tmdb_show = tmdb.TV(tmdb_show_id).info(language=LANGUAGE)
        except HTTPError as e:
            print(e)
            break
        cache.set(key, tmdb_show, CACHE_TIMEOUT)

        new_fields = get_show_new_fields(tmdb_show)

        update_fields_if_needed(show, new_fields)

        for season in tmdb_show.get('seasons'):
            season_number = season['season_number']
            key = get_tmdb_season_key(tmdb_show_id, season_number)

            try:
                tmdb_season = tmdb.TV_Seasons(tmdb_show_id, season_number).info(language=LANGUAGE)
            except HTTPError as e:
                print(e)
                break
            cache.set(key, tmdb_season, CACHE_TIMEOUT)

            new_fields = get_season_new_fields(tmdb_season, show.id)
            season, created = Season.objects.get_or_create(tmdb_show_id=show.id,
                                                           tmdb_season_number=tmdb_season.get('season_number'),
                                                           defaults=new_fields)
            if not created:
                update_fields_if_needed(season, new_fields)

            episodes = tmdb_season.get('episodes')
            existed_episodes = Episode.objects.select_related('tmdb_season').filter(tmdb_season=season)

            temp1, temp2, temp3 = get_episodes_to_create_update_delete(existed_episodes, episodes, season.id)
            episodes_to_create += temp1
            episodes_to_update += temp2
            episodes_to_delete_pks += temp3

        print(f'updated {i} of {count}')
        i += 1

        Episode.objects.filter(pk__in=episodes_to_delete_pks).delete()
        Episode.objects.bulk_update(episodes_to_update,
                                    ['tmdb_episode_number', 'tmdb_season', 'tmdb_name', 'tmdb_release_date',
                                     'tmdb_runtime'])
        Episode.objects.bulk_create(episodes_to_create)
