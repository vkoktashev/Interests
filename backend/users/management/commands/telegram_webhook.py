from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from integrations import telegram

ALLOWED_UPDATES = ('message', 'my_chat_member')


class Command(BaseCommand):
    help = 'Shows, sets or deletes the Telegram bot webhook.'

    def add_arguments(self, parser):
        parser.add_argument('action', choices=('info', 'set', 'delete'))
        parser.add_argument('url', nargs='?', help='Webhook URL, required for "set".')

    def handle(self, *args, **options):
        try:
            if options['action'] == 'info':
                info = telegram.call('getWebhookInfo')
                for key in ('url', 'pending_update_count', 'last_error_date', 'last_error_message'):
                    self.stdout.write(f'{key}: {info.get(key)}')
            elif options['action'] == 'set':
                if not options['url']:
                    raise CommandError('Pass the webhook URL.')
                if not settings.TELEGRAM_WEBHOOK_SECRET:
                    raise CommandError('TELEGRAM_WEBHOOK_SECRET is not set.')
                telegram.call(
                    'setWebhook',
                    url=options['url'],
                    secret_token=settings.TELEGRAM_WEBHOOK_SECRET,
                    allowed_updates=ALLOWED_UPDATES,
                )
                self.stdout.write(self.style.SUCCESS(f'Webhook set: {options["url"]}'))
            else:
                telegram.call('deleteWebhook')
                self.stdout.write(self.style.SUCCESS('Webhook deleted.'))
        except telegram.TelegramError as error:
            raise CommandError(error.description) from None
