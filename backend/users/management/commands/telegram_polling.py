import logging
import time

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from integrations import telegram
from users.management.commands.telegram_webhook import ALLOWED_UPDATES
from users.services.telegram import handle_update

logger = logging.getLogger(__name__)

POLL_TIMEOUT_SECS = 30
ERROR_RETRY_DELAY_SECS = 5


class Command(BaseCommand):
    help = 'Local development only: receives Telegram updates by long polling instead of the webhook.'

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError('Polling is for local development with a separate test bot (DEBUG=True).')

        try:
            telegram.call('deleteWebhook')
        except telegram.TelegramError as error:
            raise CommandError(error.description) from None

        self.stdout.write('Polling Telegram updates, press Ctrl+C to stop.')
        offset = None
        while True:
            try:
                updates = telegram.call(
                    'getUpdates',
                    request_timeout=POLL_TIMEOUT_SECS + 10,
                    offset=offset,
                    timeout=POLL_TIMEOUT_SECS,
                    allowed_updates=ALLOWED_UPDATES,
                )
            except telegram.TelegramError as error:
                self.stderr.write(error.description)
                time.sleep(ERROR_RETRY_DELAY_SECS)
                continue
            for update in updates:
                offset = update['update_id'] + 1
                try:
                    handle_update(update)
                except Exception:
                    logger.exception('telegram polling: failed to handle update')
