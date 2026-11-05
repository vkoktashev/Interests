import hashlib
import json
import logging
import os
import time
import traceback
from datetime import datetime
from zoneinfo import ZoneInfo

import redis
from django.conf import settings

COUNTS_KEY = 'error_digest:counts'
SAMPLES_KEY = 'error_digest:samples'
LAST_SEEN_KEY = 'error_digest:last_seen'
DIGEST_KEYS = (COUNTS_KEY, SAMPLES_KEY, LAST_SEEN_KEY)
SENDING_SUFFIX = ':sending'

REDIS_TIMEOUT_SECONDS = 1
MESSAGE_MAX_CHARS = 500
TRACEBACK_MAX_CHARS = 6000
MAX_GROUPS_IN_EMAIL = 30
MAX_TRACEBACKS_IN_EMAIL = 10

_redis_client = None


def get_redis_client():
    global _redis_client
    if _redis_client is None and settings.ERROR_DIGEST_REDIS_URL:
        _redis_client = redis.Redis.from_url(
            settings.ERROR_DIGEST_REDIS_URL,
            socket_timeout=REDIS_TIMEOUT_SECONDS,
            socket_connect_timeout=REDIS_TIMEOUT_SECONDS,
            decode_responses=True,
        )
    return _redis_client


class ErrorDigestHandler(logging.Handler):
    """
    Collects errors in Redis for the daily digest instead of mailing each one.
    Must not touch the database: it runs in Django's shared thread pool for request errors,
    and Redis keeps working when the cause of the errors is Postgres itself.
    """

    def __init__(self, level=logging.ERROR):
        super().__init__(level)

    def emit(self, record):
        client = get_redis_client()
        if client is None:
            return
        try:
            record_error(client, record)
        except Exception:
            self.handleError(record)


def record_error(client, record, now=None):
    sample = build_sample(record, now or time.time())
    fingerprint = hashlib.sha1(f"{sample['type']}|{sample['location']}".encode()).hexdigest()[:16]
    pipe = client.pipeline()
    pipe.hincrby(COUNTS_KEY, fingerprint, 1)
    pipe.hsetnx(SAMPLES_KEY, fingerprint, json.dumps(sample, ensure_ascii=False))
    pipe.hset(LAST_SEEN_KEY, fingerprint, sample['first_seen'])
    pipe.execute()


def build_sample(record, now):
    request = getattr(record, 'request', None)
    sample = {
        'logger': record.name,
        'path': getattr(request, 'path', ''),
        'method': getattr(request, 'method', ''),
        'first_seen': now,
    }
    if record.exc_info and record.exc_info[0]:
        exc_type, exc_value, exc_tb = record.exc_info
        sample['type'] = exc_type.__name__
        sample['message'] = _truncate(str(exc_value) or record.getMessage(), MESSAGE_MAX_CHARS)
        sample['location'] = _get_project_location(traceback.extract_tb(exc_tb)) or _get_record_location(record)
        sample['traceback'] = ''.join(traceback.format_exception(exc_type, exc_value, exc_tb))[-TRACEBACK_MAX_CHARS:]
    else:
        sample['type'] = record.levelname
        sample['message'] = _truncate(record.getMessage(), MESSAGE_MAX_CHARS)
        sample['location'] = _get_record_location(record)
        sample['traceback'] = ''
    return sample


def take_error_digest(client):
    """
    Moves collected errors aside before reading, so errors logged while the digest is being sent
    go to the next one. A batch left by a failed send is sent again before new errors.
    """
    sending_keys = [key + SENDING_SUFFIX for key in DIGEST_KEYS]
    if not client.exists(sending_keys[0]):
        existing_keys = [key for key in DIGEST_KEYS if client.exists(key)]
        if not existing_keys:
            return []
        pipe = client.pipeline()
        for key in existing_keys:
            pipe.rename(key, key + SENDING_SUFFIX)
        pipe.execute()

    counts, samples, last_seen = (client.hgetall(key) for key in sending_keys)
    groups = []
    for fingerprint, count in counts.items():
        raw_sample = samples.get(fingerprint)
        if raw_sample is None:
            continue
        sample = json.loads(raw_sample)
        sample['count'] = int(count)
        sample['last_seen'] = float(last_seen.get(fingerprint, sample['first_seen']))
        groups.append(sample)
    groups.sort(key=lambda group: group['count'], reverse=True)
    return groups


def acknowledge_error_digest(client):
    client.delete(*(key + SENDING_SUFFIX for key in DIGEST_KEYS))


def format_error_digest(groups):
    timezone = ZoneInfo(settings.CELERY_TIMEZONE)
    fmt = lambda ts: datetime.fromtimestamp(ts, timezone).strftime('%d.%m %H:%M')
    total = sum(group['count'] for group in groups)
    period_start = fmt(min(group['first_seen'] for group in groups))
    period_end = fmt(max(group['last_seen'] for group in groups))

    subject = f'Interests: {_plural(total, "ошибка", "ошибки", "ошибок")}, видов: {len(groups)}'
    lines = [f'Ошибки на сервере с {period_start} по {period_end} (МСК): '
             f'{_plural(total, "событие", "события", "событий")}, видов: {len(groups)}.', '']

    shown = groups[:MAX_GROUPS_IN_EMAIL]
    for index, group in enumerate(shown, start=1):
        lines.append(f"{index}. {group['count']} × {group['type']}: {group['message']}")
        lines.append(f"   Где: {group['location']}")
        if group['path']:
            lines.append(f"   Пример запроса: {group['method']} {group['path']}".rstrip())
        lines.append(f"   Впервые: {fmt(group['first_seen'])}, последний раз: {fmt(group['last_seen'])}")
        lines.append('')
    if len(groups) > len(shown):
        lines.append(f'…и ещё видов: {len(groups) - len(shown)}.')
        lines.append('')

    with_traceback = [(index, group) for index, group in enumerate(shown, start=1) if group['traceback']]
    if with_traceback:
        lines.append('Трейсбеки (по одному примеру на вид):')
        for index, group in with_traceback[:MAX_TRACEBACKS_IN_EMAIL]:
            lines.extend(['', f'--- #{index} ---', group['traceback'].rstrip()])
    return subject, '\n'.join(lines).rstrip() + '\n'


def _get_project_location(frames):
    project_frames = [frame for frame in frames if _is_project_file(frame.filename)]
    if not project_frames:
        return None
    frame = project_frames[-1]
    return f'{_relative_path(frame.filename)}:{frame.lineno} in {frame.name}'


def _get_record_location(record):
    return f'{_relative_path(record.pathname)}:{record.lineno} in {record.funcName}'


def _is_project_file(filename):
    path = os.path.abspath(filename)
    return path.startswith(os.path.abspath(settings.BASE_DIR) + os.sep) and 'site-packages' not in path


def _relative_path(filename):
    path = os.path.abspath(filename)
    base = os.path.abspath(settings.BASE_DIR) + os.sep
    return path[len(base):].replace(os.sep, '/') if path.startswith(base) else filename


def _truncate(text, limit):
    return text if len(text) <= limit else text[:limit - 1] + '…'


def _plural(number, one, few, many):
    if number % 10 == 1 and number % 100 != 11:
        word = one
    elif 2 <= number % 10 <= 4 and not 12 <= number % 100 <= 14:
        word = few
    else:
        word = many
    return f'{number} {word}'
