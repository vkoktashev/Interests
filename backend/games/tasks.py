from datetime import datetime
from json import JSONDecodeError

from celery.schedules import crontab
from django.core.cache import cache
from django.db.models import Q
from howlongtobeatpy import HowLongToBeat
from requests.exceptions import ConnectionError

from config.celery import app
from games.functions import get_game_new_fields, get_hltb_game_key
from games.models import Game, Genre, GameGenre, GameStore, Store
from utils.constants import rawg, UPDATE_DATES_HOUR, UPDATE_DATES_MINUTE, CACHE_TIMEOUT
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
        update_game_details(game.rawg_slug, game)
        refresh_hltb_cache(game)
        print(game.rawg_name)


@app.task
def refresh_game_details(slug):
    update_game_details(slug)


def update_game_details(slug, game_obj=None):
    try:
        rawg_game = rawg.game_request(slug)
        if not isinstance(rawg_game, dict) or not rawg_game.get('slug'):
            return None
    except (ConnectionError, JSONDecodeError, ValueError, TypeError):
        return None

    if game_obj is None:
        game_obj = Game.objects.filter(rawg_slug=slug).first()

    new_fields = get_game_new_fields(rawg_game)
    if game_obj is None:
        game_obj, created = Game.objects.get_or_create(rawg_id=rawg_game.get('id'), defaults=new_fields)
        if not created:
            update_fields_if_needed(game_obj, new_fields)
    else:
        update_fields_if_needed(game_obj, new_fields)

    sync_game_genres(game_obj, rawg_game)
    sync_game_stores(game_obj, rawg_game)
    return game_obj


def sync_game_genres(game, rawg_game):
    keep_ids = []

    for genre in rawg_game.get('genres') or []:
        genre_obj, _ = Genre.objects.get_or_create(
            rawg_id=genre.get('id'),
            defaults={
                'rawg_name': genre.get('name'),
                'rawg_slug': genre.get('slug'),
            }
        )
        if genre_obj.rawg_name != genre.get('name') or genre_obj.rawg_slug != genre.get('slug'):
            genre_obj.rawg_name = genre.get('name') or genre_obj.rawg_name
            genre_obj.rawg_slug = genre.get('slug') or genre_obj.rawg_slug
            genre_obj.save(update_fields=('rawg_name', 'rawg_slug'))

        game_genre, _ = GameGenre.objects.get_or_create(game=game, genre=genre_obj)
        keep_ids.append(game_genre.id)

    GameGenre.objects.filter(game=game).exclude(id__in=keep_ids).delete()


def sync_game_stores(game, rawg_game):
    try:
        stores_response = rawg.get_stores(rawg_game.get('slug'))
    except Exception:
        stores_response = []

    keep_ids = []
    for game_store in rawg_game.get('stores') or []:
        store = game_store.get('store') or {}
        if store.get('id') is None:
            continue
        store_obj, _ = Store.objects.get_or_create(
            rawg_id=store.get('id'),
            defaults={
                'rawg_name': store.get('name') or '',
                'rawg_slug': store.get('slug') or '',
            }
        )
        if store_obj.rawg_name != (store.get('name') or '') or store_obj.rawg_slug != (store.get('slug') or ''):
            store_obj.rawg_name = store.get('name') or store_obj.rawg_name
            store_obj.rawg_slug = store.get('slug') or store_obj.rawg_slug
            store_obj.save(update_fields=('rawg_name', 'rawg_slug'))

        game_store_url = find_game_store_url_sync(stores_response, store_obj)
        game_store_obj, _ = GameStore.objects.get_or_create(
            store=store_obj,
            game=game,
            defaults={'url': game_store_url or ''}
        )
        if game_store_obj.url != (game_store_url or ''):
            game_store_obj.url = game_store_url or ''
            game_store_obj.save(update_fields=('url',))
        keep_ids.append(game_store_obj.id)

    GameStore.objects.filter(game=game).exclude(id__in=keep_ids).delete()


def find_game_store_url_sync(game_stores, store_obj):
    for game_store in game_stores or []:
        if store_obj.rawg_id == getattr(game_store, 'store_id', None):
            return getattr(game_store, 'url', None)
    return None


def refresh_hltb_cache(game):
    hltb_key = get_hltb_game_key(game.rawg_name)
    try:
        results = HowLongToBeat(1).search(game.rawg_name.replace('’', '\''), similarity_case_sensitive=False)
        hltb_game = max(results, key=lambda element: element.similarity).__dict__
        cache.set(hltb_key, hltb_game, CACHE_TIMEOUT)
    except (ValueError, TypeError):
        cache.set(hltb_key, None, CACHE_TIMEOUT)
    except ConnectionError:
        pass
