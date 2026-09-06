from django.core.management.base import BaseCommand, CommandError

from content_collections.services.kinopoisk_top250 import (
    KINOPOISK_TOP250_SYNC_TIMEOUT,
    KINOPOISK_TOP250_SYSTEM_KEY,
    sync_kinopoisk_top250,
)
from integrations.exceptions import ExternalIntegrationError
from utils.celery import execute_locked_task


class Command(BaseCommand):
    help = 'Synchronize the system Kinopoisk Top 250 collection'

    def handle(self, *args, **options):
        self.stdout.write('Starting Kinopoisk Top 250 synchronization...')
        try:
            result = execute_locked_task(
                'sync_kinopoisk_top250',
                KINOPOISK_TOP250_SYSTEM_KEY,
                sync_kinopoisk_top250,
                timeout=KINOPOISK_TOP250_SYNC_TIMEOUT,
            )
        except ExternalIntegrationError as error:
            raise CommandError(str(error)) from error

        if result is None:
            self.stdout.write(
                self.style.WARNING('Synchronization is already running; command skipped.')
            )
            return

        self.stdout.write(self.style.SUCCESS(
            'Kinopoisk Top 250 synchronization completed: '
            f'movies={result["movies"]}, '
            f'loaded={result["loaded"]}, '
            f'skipped={result["skipped"]}'
        ))
