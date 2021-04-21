from datetime import datetime

import tmdbsimple as tmdb
from celery.schedules import crontab
from django.core.cache import cache
from django.db.models import Q
from requests import HTTPError

from config.celery import app
from shows.models import Show, Episode, UserShow, Season
from utils.constants import LANGUAGE, CACHE_TIMEOUT, UPDATE_DATES_HOUR, UPDATE_DATES_MINUTE, TMDB_BACKDROP_PATH_PREFIX
from utils.functions import get_tmdb_show_key, update_fields_if_needed, get_tmdb_season_key, \
    update_fields_if_needed_without_save


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

        new_fields = {
            'imdb_id': tmdb_show.get('imdb_id') if tmdb_show.get('imdb_id') is not None else '',
            'tmdb_original_name': tmdb_show['original_name'],
            'tmdb_name': tmdb_show['name'],
            'tmdb_episode_run_time': tmdb_show['episode_run_time'][0] if len(tmdb_show['episode_run_time']) > 0 else 0,
            'tmdb_backdrop_path': TMDB_BACKDROP_PATH_PREFIX + tmdb_show['backdrop_path']
            if tmdb_show['backdrop_path'] else '',
            'tmdb_release_date': tmdb_show['first_air_date'] if tmdb_show['first_air_date'] != "" else None,
            'tmdb_status': tmdb_show.get('status'),
            'tmdb_number_of_episodes': tmdb_show.get('number_of_episodes')
        }

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

            new_fields = {
                'tmdb_season_number': tmdb_season.get('season_number'),
                'tmdb_name': tmdb_season.get('name'),
                'tmdb_show_id': show.pk
            }
            season, created = Season.objects.get_or_create(tmdb_id=tmdb_season.get('id'),
                                                           defaults=new_fields)
            if not created:
                update_fields_if_needed(season, new_fields)

            episodes = tmdb_season.get('episodes')
            existed_episodes = Episode.objects.select_related('tmdb_season').filter(tmdb_season=season)

            for existed_episode in existed_episodes:
                exists = False
                for episode in episodes:
                    if episode['id'] == existed_episode.tmdb_id:
                        exists = True
                        episode['exists'] = True
                        new_fields = {
                            'tmdb_episode_number': episode.get('episode_number'),
                            'tmdb_season': season,
                            'tmdb_name': episode.get('name'),
                            'tmdb_release_date': episode.get('air_date') if episode.get('air_date') != "" else None
                        }
                        update_fields_if_needed_without_save(existed_episode, new_fields)
                        episodes_to_update.append(existed_episode)
                        break

                if not exists:
                    episodes_to_delete_pks.append(existed_episode.pk)

            for episode in episodes:
                if episode.get('exists'):
                    del episode['exists']
                else:
                    episodes_to_create.append(Episode(tmdb_id=episode.get('id'),
                                                      tmdb_episode_number=episode.get('episode_number'),
                                                      tmdb_season=season,
                                                      tmdb_release_date=episode.get('air_date')
                                                      if episode.get('air_date') != "" else None,
                                                      tmdb_name=episode.get('name')))
                print(episode['name'], episode['id'])
    Episode.objects.filter(pk__in=episodes_to_delete_pks).delete()
    Episode.objects.bulk_update(episodes_to_update,
                                ['tmdb_episode_number', 'tmdb_season', 'tmdb_name', 'tmdb_release_date'])
    Episode.objects.bulk_create(episodes_to_create)
