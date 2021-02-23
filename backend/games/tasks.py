from datetime import datetime

from celery.schedules import crontab
from django.core.cache import cache
from django.db.models import Q

from config.celery import app
from games.models import Game
from utils.constants import rawg, CACHE_TIMEOUT, UPDATE_DATES_HOUR, UPDATE_DATES_MINUTE
from utils.functions import get_rawg_game_key, update_fields_if_needed


@app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(
        crontab(hour=UPDATE_DATES_HOUR, minute=UPDATE_DATES_MINUTE),
        update_upcoming_games.s(),
    )


@app.task
def update_upcoming_games():
    today_date = datetime.today().date()

    games = Game.objects \
        .filter(Q(rawg_release_date__gte=today_date) | (Q(rawg_release_date=None) & Q(rawg_tba=True)))

    for game in games:
        slug = game.rawg_slug
        key = get_rawg_game_key(slug)
        rawg_game = rawg.get_game(slug).json
        cache.set(key, rawg_game, CACHE_TIMEOUT)
        new_fields = {
            'rawg_slug': rawg_game.get('slug'),
            'rawg_name': rawg_game.get('name'),
            'rawg_release_date': rawg_game.get('released'),
            'rawg_tba': rawg_game.get('tba'),
            'rawg_backdrop_path': rawg_game.get('background_image')
        }
        update_fields_if_needed(game, new_fields)
        print(game.rawg_name)
