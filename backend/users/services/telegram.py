import hmac
import logging
import secrets

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.utils.html import escape

from config.settings import FRONTEND_URL
from integrations import telegram
from users.models import User

logger = logging.getLogger(__name__)

LINK_TOKEN_TTL_SECS = 60 * 10
PROCESSED_UPDATE_TTL_SECS = 60 * 60 * 24

SETTINGS_URL = f'{FRONTEND_URL}/settings/'
HELP_TEXT = (
    'Я присылаю уведомления о релизах с сайта '
    f'<a href="{FRONTEND_URL}/">Interests</a>.\n\n'
    f'Чтобы подключить аккаунт, нажмите «Подключить Telegram» в <a href="{SETTINGS_URL}">настройках</a>.\n'
    'Отключить уведомления: /stop'
)


class TelegramLinkError(Exception):
    pass


def get_telegram_link_status(user):
    return {
        'is_available': telegram.is_configured(),
        'is_linked': user.telegram_chat_id is not None,
        'telegram_username': user.telegram_username,
    }


def create_telegram_link(user):
    try:
        bot_username = telegram.get_bot_username()
    except telegram.TelegramError as error:
        logger.warning('telegram link: bot is unavailable: %s', error.description)
        raise TelegramLinkError('Telegram бот сейчас недоступен, попробуйте позже.') from None

    token = secrets.token_urlsafe(24)
    cache.set(_link_token_cache_key(token), user.id, LINK_TOKEN_TTL_SECS)
    return {
        'url': f'https://t.me/{bot_username}?start={token}',
        'expires_in': LINK_TOKEN_TTL_SECS,
    }


def unlink_telegram_account(user):
    user.telegram_chat_id = None
    user.telegram_username = None
    user.save(update_fields=('telegram_chat_id', 'telegram_username'))


def is_valid_webhook_secret(header_value):
    expected = settings.TELEGRAM_WEBHOOK_SECRET
    if not expected or not header_value:
        return False
    return hmac.compare_digest(expected.encode(), header_value.encode())


def handle_update(update):
    update_id = update.get('update_id')
    if update_id is not None and not cache.add(_processed_update_cache_key(update_id), True,
                                               PROCESSED_UPDATE_TTL_SECS):
        return

    if 'my_chat_member' in update:
        _handle_chat_member(update['my_chat_member'])
        return

    message = update.get('message')
    if not message or message.get('chat', {}).get('type') != 'private':
        return

    chat_id = message['chat']['id']
    command, _, argument = (message.get('text') or '').strip().partition(' ')
    command = command.split('@', 1)[0]

    if command == '/start' and argument:
        reply = _link_chat(chat_id, message.get('from') or {}, argument.strip())
    elif command == '/stop':
        reply = _unlink_chat(chat_id)
    else:
        reply = HELP_TEXT
    _reply(chat_id, reply)


def disable_unavailable_chat(user):
    logger.info('telegram: chat is unavailable, unlinking user id=%s', user.id)
    unlink_telegram_account(user)


def _link_chat(chat_id, sender, token):
    cache_key = _link_token_cache_key(token)
    user_id = cache.get(cache_key)
    if user_id is None:
        return (
            'Ссылка устарела или уже использована. '
            f'Получите новую в <a href="{SETTINGS_URL}">настройках</a>.'
        )
    cache.delete(cache_key)

    with transaction.atomic():
        user = User.objects.select_for_update().filter(id=user_id).first()
        if user is None:
            return 'Аккаунт не найден.'
        User.objects.filter(telegram_chat_id=chat_id).exclude(id=user.id) \
            .update(telegram_chat_id=None, telegram_username=None)
        user.telegram_chat_id = chat_id
        user.telegram_username = sender.get('username')
        user.save(update_fields=('telegram_chat_id', 'telegram_username'))

    channel_hint = '' if user.notify_by_telegram else (
        f'\n\nВключите канал «Telegram» в <a href="{SETTINGS_URL}">настройках уведомлений</a>.'
    )
    return f'Аккаунт <b>{escape(user.username)}</b> подключён.{channel_hint}'


def _unlink_chat(chat_id):
    users = list(User.objects.filter(telegram_chat_id=chat_id))
    for user in users:
        unlink_telegram_account(user)
    if not users:
        return 'Этот чат не подключён ни к одному аккаунту.'
    return (
        'Telegram отключён, уведомления сюда больше не придут. '
        f'Подключить снова можно в <a href="{SETTINGS_URL}">настройках</a>.'
    )


def _handle_chat_member(chat_member):
    chat = chat_member.get('chat') or {}
    status = (chat_member.get('new_chat_member') or {}).get('status')
    if chat.get('type') == 'private' and status == 'kicked':
        for user in User.objects.filter(telegram_chat_id=chat.get('id')):
            disable_unavailable_chat(user)


def _reply(chat_id, text):
    try:
        telegram.send_message(chat_id, text)
    except telegram.TelegramError as error:
        logger.warning('telegram: failed to reply chat_id=%s: %s', chat_id, error.description)


def _link_token_cache_key(token):
    return f'telegram_link:{token}'


def _processed_update_cache_key(update_id):
    return f'telegram_update:{update_id}'
