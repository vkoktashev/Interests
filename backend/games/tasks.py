from datetime import datetime

from celery.schedules import crontab
from django.core.cache import cache
from django.db.models import Q
from howlongtobeatpy import HowLongToBeat

from config.celery import app
from games.functions import get_hltb_game_key, get_game_new_fields, get_rawg_game_key
from games.models import Game
from utils.constants import rawg, CACHE_TIMEOUT, UPDATE_DATES_HOUR, UPDATE_DATES_MINUTE
from utils.functions import update_fields_if_needed


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
        rawg_key = get_rawg_game_key(slug)
        hltb_key = get_hltb_game_key(game.rawg_name)

        rawg_game = rawg.get_game(slug).json
        try:
            results = HowLongToBeat(1).search(game.rawg_name.replace('’', '\''), similarity_case_sensitive=False)
            hltb_game = max(results, key=lambda element: element.similarity).__dict__
            cache.set(hltb_key, hltb_game, CACHE_TIMEOUT)
        except (ValueError, TypeError):
            hltb_game = None
            cache.set(hltb_key, hltb_game, CACHE_TIMEOUT)
        except ConnectionError:
            hltb_game = None

        cache.set(rawg_key, rawg_game, CACHE_TIMEOUT)
        new_fields = get_game_new_fields(rawg_game, hltb_game)
        update_fields_if_needed(game, new_fields)
        print(game.rawg_name)
