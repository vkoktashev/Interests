from datetime import timedelta

from asgiref.sync import sync_to_async
from django.core.cache import cache
from django.utils import timezone

from games.functions import is_game_released
from games.integrations.hltb import build_hltb_response_from_hours
from games.models import GameBeatTime
from games.services.catalog import get_or_create_game
from games.tasks import (
    HLTB_REFRESH_LOCK_TIMEOUT_SECONDS,
    get_hltb_refresh_lock_key,
    refresh_hltb_beat_times_by_game_id,
)
from utils.celery import enqueue_background_task


HLTB_REFRESH_INTERVAL = timedelta(days=1)


async def get_hltb_payload(slug):
    game = await get_or_create_game(slug)
    if not is_game_released(game, timezone.now().date()):
        return {}

    hltb_entries = []
    igdb_entries = []
    async for entry in GameBeatTime.objects.filter(game=game):
        if entry.source == GameBeatTime.SOURCE_HLTB:
            hltb_entries.append(entry)
        elif entry.source == GameBeatTime.SOURCE_IGDB:
            igdb_entries.append(entry)

    is_refreshing = await _is_refresh_active(game.id)
    if not is_refreshing and _should_queue_refresh(game, hltb_entries, timezone.now()):
        is_refreshing = await _enqueue_refresh(game.id)

    if hltb_entries or igdb_entries:
        preferred_source = GameBeatTime.SOURCE_HLTB if hltb_entries else GameBeatTime.SOURCE_IGDB
        preferred_entries = hltb_entries if hltb_entries else igdb_entries
        payload = build_hltb_response_from_hours(_build_hours_map(preferred_entries))
        payload['source'] = preferred_source
        if game.hltb_id:
            payload['hltb_id'] = game.hltb_id
        payload['refreshing'] = is_refreshing
        return payload

    if is_refreshing:
        payload = {'refreshing': True}
        if game.hltb_id:
            payload['hltb_id'] = game.hltb_id
        return payload
    if game.hltb_id:
        return {'hltb_id': game.hltb_id}
    return {}


def _build_hours_map(entries):
    hours_map = {}
    for entry in entries:
        if entry.type == GameBeatTime.TYPE_MAIN:
            hours_map['main'] = entry.hours
        elif entry.type == GameBeatTime.TYPE_EXTRA:
            hours_map['extra'] = entry.hours
        elif entry.type == GameBeatTime.TYPE_COMPLETE:
            hours_map['complete'] = entry.hours
    return hours_map


def _should_queue_refresh(game, hltb_entries, now):
    if not game.igdb_name:
        return False

    updates = [entry.last_update for entry in hltb_entries if entry.last_update]
    latest_update = max(updates) if updates else None
    if latest_update and latest_update > now - HLTB_REFRESH_INTERVAL:
        return False
    return not game.hltb_last_attempt or game.hltb_last_attempt <= now - HLTB_REFRESH_INTERVAL


async def _is_refresh_active(game_id):
    return bool(await sync_to_async(cache.get)(get_hltb_refresh_lock_key(game_id)))


async def _enqueue_refresh(game_id):
    lock_key = get_hltb_refresh_lock_key(game_id)
    is_acquired = await sync_to_async(cache.add)(
        lock_key,
        True,
        HLTB_REFRESH_LOCK_TIMEOUT_SECONDS,
    )
    if not is_acquired:
        return True

    is_queued = await sync_to_async(enqueue_background_task)(
        refresh_hltb_beat_times_by_game_id,
        args=(game_id,),
        task_name='refresh_hltb_beat_times_by_game_id',
    )
    if not is_queued:
        await sync_to_async(cache.delete)(lock_key)
        return False
    return True
