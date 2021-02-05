from datetime import datetime

import tmdbsimple as tmdb
from celery.schedules import crontab
from django.core.cache import cache
from django.db.models import Q

from config.celery import app
from shows.models import Show, Episode, Season
from utils.constants import LANGUAGE, CACHE_TIMEOUT, UPDATE_DATES_HOUR, UPDATE_DATES_MINUTE
from utils.functions import get_tmdb_show_key, update_fields_if_needed, get_tmdb_episode_key


@app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    # sender.add_periodic_task(
    #     crontab(hour=UPDATE_DATES_HOUR, minute=UPDATE_DATES_MINUTE),
    #     update_upcoming_shows_dates.s(),
    # )
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
    # TODO запрашивать сезоны, а не серии
    today_date = datetime.today().date()

    episodes = Episode.objects.select_related('tmdb_show') \
        .filter(Q(tmdb_release_date__gte=today_date) | Q(tmdb_release_date=None)) \
        .exclude(tmdb_season_number=0)

    for episode in episodes:
        key = get_tmdb_episode_key(episode.tmdb_show_id, episode.tmdb_season_number, episode.tmdb_episode_number)
        tmdb_episode = tmdb.TV_Episodes(episode.tmdb_show_id, episode.tmdb_season_number, episode.tmdb_episode_number) \
            .info(language=LANGUAGE)
        cache.set(key, tmdb_episode, CACHE_TIMEOUT)
        update_fields_if_needed(episode, {
            'tmdb_release_date': tmdb_episode.get('air_date') if tmdb_episode.get('air_date') != "" else None
        })
        print(episode.tmdb_name + ' ' + episode.tmdb_show.tmdb_name)
