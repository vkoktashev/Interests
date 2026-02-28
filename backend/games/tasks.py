from datetime import datetime
from json import JSONDecodeError

from celery.schedules import crontab
from django.core.cache import cache
from django.db.models import Q
from howlongtobeatpy import HowLongToBeat
from requests.exceptions import ConnectionError

from config.celery import app
from games.functions import get_game_new_fields, get_hltb_game_key, get_rawg_game_trailers, get_rawg_game_screenshots
from games.models import Game, Genre, GameGenre, GameStore, Store, GameDeveloper, GameTrailer, GameScreenshot
from people.models import Developer
from utils.constants import rawg, UPDATE_DATES_HOUR, UPDATE_DATES_MINUTE, CACHE_TIMEOUT
from utils.functions import update_fields_if_needed


def get_rawg_count(value):
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


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
    sync_game_developers(game_obj, rawg_game)
    sync_game_stores(game_obj, rawg_game)

    expected_movies_count = get_rawg_count(rawg_game.get('movies_count'))
    expected_screenshots_count = get_rawg_count(rawg_game.get('screenshots_count'))
    rawg_slug = rawg_game.get('slug') or slug

    if expected_movies_count is not None:
        trailers_db_count = GameTrailer.objects.filter(game=game_obj).count()
        if trailers_db_count != expected_movies_count:
            try:
                rawg_trailers = get_rawg_game_trailers(rawg_slug)
            except (ConnectionError, JSONDecodeError, ValueError, TypeError):
                rawg_trailers = None
            if rawg_trailers is not None:
                sync_game_trailers(game_obj, rawg_trailers)

    if expected_screenshots_count is not None:
        screenshots_db_count = GameScreenshot.objects.filter(game=game_obj).count()
        if screenshots_db_count != expected_screenshots_count:
            try:
                rawg_screenshots = get_rawg_game_screenshots(rawg_slug)
            except (ConnectionError, JSONDecodeError, ValueError, TypeError):
                rawg_screenshots = None
            if rawg_screenshots is not None:
                sync_game_screenshots(game_obj, rawg_screenshots)
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


def sync_game_developers(game, rawg_game):
    keep_ids = []
    for index, developer in enumerate(rawg_game.get('developers') or []):
        developer_id = developer.get('id')
        developer_name = developer.get('name')
        if developer_id is None or not developer_name:
            continue

        developer_obj, _ = Developer.objects.get_or_create(
            rawg_id=developer_id,
            defaults={'name': developer_name}
        )
        if developer_obj.name != developer_name:
            developer_obj.name = developer_name
            developer_obj.save(update_fields=('name',))

        game_developer, _ = GameDeveloper.objects.get_or_create(
            game=game,
            developer=developer_obj,
            defaults={'sort_order': index}
        )
        if game_developer.sort_order != index:
            game_developer.sort_order = index
            game_developer.save(update_fields=('sort_order',))
        keep_ids.append(game_developer.id)

    GameDeveloper.objects.filter(game=game).exclude(id__in=keep_ids).delete()


def sync_game_trailers(game, rawg_trailers):
    keep_ids = []
    for index, trailer in enumerate(rawg_trailers or []):
        trailer_id = trailer.get('id')
        if trailer_id is not None:
            game_trailer, _ = GameTrailer.objects.get_or_create(
                game=game,
                rawg_id=trailer_id,
                defaults={'sort_order': index}
            )
        else:
            trailer_url = trailer.get('url') or ''
            if not trailer_url:
                continue
            game_trailer = GameTrailer.objects.filter(game=game, url=trailer_url).first()
            if game_trailer is None:
                game_trailer = GameTrailer.objects.create(game=game, url=trailer_url, sort_order=index)

        game_trailer.name = trailer.get('name') or ''
        game_trailer.preview = trailer.get('preview') or ''
        game_trailer.url = trailer.get('url') or ''
        game_trailer.video_max = (trailer.get('data') or {}).get('max') or ''
        game_trailer.video_480 = (trailer.get('data') or {}).get('480') or ''
        game_trailer.video_320 = (trailer.get('data') or {}).get('320') or ''
        game_trailer.sort_order = index
        game_trailer.save(update_fields=('name', 'preview', 'url', 'video_max', 'video_480', 'video_320', 'sort_order'))
        keep_ids.append(game_trailer.id)

    GameTrailer.objects.filter(game=game).exclude(id__in=keep_ids).delete()
    new_movies_count = len(rawg_trailers or [])
    if game.rawg_movies_count != new_movies_count:
        game.rawg_movies_count = new_movies_count
        game.save(update_fields=('rawg_movies_count',))


def sync_game_screenshots(game, rawg_screenshots):
    keep_ids = []
    for index, screenshot in enumerate(rawg_screenshots or []):
        screenshot_id = screenshot.get('id')
        if screenshot_id is not None:
            game_screenshot, _ = GameScreenshot.objects.get_or_create(
                game=game,
                rawg_id=screenshot_id,
                defaults={'sort_order': index}
            )
        else:
            image_url = screenshot.get('image') or ''
            if not image_url:
                continue
            game_screenshot = GameScreenshot.objects.filter(game=game, image=image_url).first()
            if game_screenshot is None:
                game_screenshot = GameScreenshot.objects.create(game=game, image=image_url, sort_order=index)

        game_screenshot.image = screenshot.get('image') or ''
        game_screenshot.width = screenshot.get('width')
        game_screenshot.height = screenshot.get('height')
        game_screenshot.sort_order = index
        game_screenshot.save(update_fields=('image', 'width', 'height', 'sort_order'))
        keep_ids.append(game_screenshot.id)

    GameScreenshot.objects.filter(game=game).exclude(id__in=keep_ids).delete()
    new_screenshots_count = len(rawg_screenshots or [])
    if game.rawg_screenshots_count != new_screenshots_count:
        game.rawg_screenshots_count = new_screenshots_count
        game.save(update_fields=('rawg_screenshots_count',))


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
