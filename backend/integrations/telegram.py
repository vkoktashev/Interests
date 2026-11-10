import time

import requests
from django.conf import settings
from django.core.cache import cache
from requests import RequestException

TELEGRAM_TIMEOUT_SECS = 15
TELEGRAM_MESSAGE_LIMIT = 4096
TELEGRAM_MAX_RETRY_AFTER_SECS = 30
BOT_USERNAME_CACHE_KEY = 'telegram_bot_username'
BOT_USERNAME_CACHE_TTL_SECS = 60 * 60 * 24


class TelegramError(Exception):
    def __init__(self, description, error_code=None, retry_after=None):
        super().__init__(description)
        self.description = description
        self.error_code = error_code
        self.retry_after = retry_after


class TelegramNotConfiguredError(TelegramError):
    pass


class TelegramChatUnavailableError(TelegramError):
    pass


def is_configured():
    return bool(settings.TELEGRAM_TOKEN)


def call(method, request_timeout=TELEGRAM_TIMEOUT_SECS, **params):
    if not is_configured():
        raise TelegramNotConfiguredError('TELEGRAM_TOKEN is not set')

    url = f'{settings.TELEGRAM_API_URL.rstrip("/")}/bot{settings.TELEGRAM_TOKEN}/{method}'
    try:
        response = requests.post(url, json=params, timeout=request_timeout)
    except RequestException as error:
        # Drop the cause: requests puts the URL with the bot token into its messages.
        raise TelegramError(f'{method}: {type(error).__name__}') from None

    try:
        data = response.json()
    except ValueError:
        raise TelegramError(f'{method}: HTTP {response.status_code}', response.status_code) from None

    if data.get('ok'):
        return data.get('result')

    error_code = data.get('error_code', response.status_code)
    description = f'{method}: {data.get("description", "unknown error")}'
    retry_after = (data.get('parameters') or {}).get('retry_after')
    if error_code == 403 or (error_code == 400 and 'chat not found' in description.lower()):
        raise TelegramChatUnavailableError(description, error_code)
    raise TelegramError(description, error_code, retry_after)


def send_message(chat_id, text):
    params = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': 'HTML',
        'link_preview_options': {'is_disabled': True},
    }
    try:
        return call('sendMessage', **params)
    except TelegramError as error:
        if error.error_code != 429 or not error.retry_after:
            raise
        time.sleep(min(error.retry_after, TELEGRAM_MAX_RETRY_AFTER_SECS))
        return call('sendMessage', **params)


def get_bot_username():
    username = cache.get(BOT_USERNAME_CACHE_KEY)
    if username is None:
        username = call('getMe')['username']
        cache.set(BOT_USERNAME_CACHE_KEY, username, BOT_USERNAME_CACHE_TTL_SECS)
    return username


def split_message(text, limit=TELEGRAM_MESSAGE_LIMIT):
    chunks = []
    current = ''
    for line in text.split('\n'):
        while len(line) > limit:
            if current:
                chunks.append(current)
                current = ''
            chunks.append(line[:limit])
            line = line[limit:]
        candidate = f'{current}\n{line}' if current else line
        if len(candidate) > limit:
            chunks.append(current)
            current = line
        else:
            current = candidate
    if current.strip():
        chunks.append(current)
    return chunks
