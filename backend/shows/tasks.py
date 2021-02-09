from datetime import datetime

import tmdbsimple as tmdb
from celery.schedules import crontab
from django.core.cache import cache
from django.db.models import Q
from requests import HTTPError

from config.celery import app
from shows.models import Show, Episode
from utils.constants import LANGUAGE, CACHE_TIMEOUT, UPDATE_DATES_HOUR, UPDATE_DATES_MINUTE
from utils.functions import get_tmdb_show_key, update_fields_if_needed, get_tmdb_season_key


@app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(
        crontab(hour=UPDATE_DATES_HOUR, minute=UPDATE_DATES_MINUTE),
        update_upcoming_shows_dates.s(),
    )
    sender.add_periodic_task(
        crontab(hour=UPDATE_DATES_HOUR, minute=UPDATE_DATES_MINUTE),
        update_upcoming_episodes_dates.s(),
    )


@app.task
def update_upcoming_shows_dates():
    today_date = datetime.today().date()

    shows = Show.objects \
        .filter(Q(tmdb_release_date__gte=today_date) | Q(tmdb_release_date=None))

    for show in shows:
        tmdb_id = show.tmdb_id
        key = get_tmdb_show_key(tmdb_id)
        tmdb_show = tmdb.TV(tmdb_id).info(language=LANGUAGE)
        cache.set(key, tmdb_show, CACHE_TIMEOUT)
        update_fields_if_needed(show, {
            'tmdb_release_date': tmdb_show.get('first_air_date') if tmdb_show.get('first_air_date') != "" else None
        })
        print(show.tmdb_name)


@app.task
def update_upcoming_episodes_dates():
    today_date = datetime.today().date()

    seasons_to_check = Episode.objects.select_related('tmdb_season') \
        .filter(Q(tmdb_release_date__gte=today_date) | Q(tmdb_release_date=None)) \
        .exclude(tmdb_season__tmdb_season_number=0) \
        .values('tmdb_season__tmdb_id', 'tmdb_season__tmdb_show__tmdb_id', 'tmdb_season__tmdb_season_number') \
        .distinct()

    for season in seasons_to_check:
        show_id = season['tmdb_season__tmdb_show__tmdb_id']
        season_number = season['tmdb_season__tmdb_season_number']
        tmdb_season_id = season['tmdb_season__tmdb_id']
        key = get_tmdb_season_key(show_id, season_number)
        try:
            tmdb_season = tmdb.TV_Seasons(show_id, season_number).info(language=LANGUAGE)
        except HTTPError:
            continue
        cache.set(key, tmdb_season, CACHE_TIMEOUT)

        episodes = tmdb_season.get('episodes')
        existed_episodes = Episode.objects.filter(
            tmdb_id__in=[episode.get('id') for episode in episodes])
        episodes_to_create = []

        for episode in episodes:
            exists = False

            for existed_episode in existed_episodes:
                if episode['id'] == existed_episode.tmdb_id:
                    exists = True

                    new_fields = {
                        'tmdb_id': episode.get('id'),
                        'tmdb_episode_number': episode.get('episode_number'),
                        'tmdb_season_id': tmdb_season_id,
                        'tmdb_name': episode.get('name'),
                        'tmdb_release_date': episode.get('air_date') if episode.get('air_date') != "" else None
                    }
                    update_fields_if_needed(existed_episode, new_fields)
                    break

            if not exists:
                episodes_to_create.append(Episode(tmdb_id=episode.get('id'),
                                                  tmdb_episode_number=episode.get('episode_number'),
                                                  tmdb_season_id=tmdb_season_id,
                                                  tmdb_name=episode.get('name')))

            print(episode['name'], episode['id'])
        Episode.objects.bulk_create(episodes_to_create)
