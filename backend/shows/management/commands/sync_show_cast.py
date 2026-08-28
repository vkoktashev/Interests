from django.core.management.base import BaseCommand

from shows.services.cast_sync import run_show_cast_sync


class Command(BaseCommand):
    help = 'Synchronize the full TMDB cast and creators for all shows'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Limit number of shows to process (0 = no limit)',
        )
        parser.add_argument(
            '--start-id',
            type=int,
            default=0,
            help='Process shows starting from this database ID',
        )
        parser.add_argument(
            '--delay',
            type=float,
            default=0.25,
            help='Minimum delay between shows in seconds (default: 0.25)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Clear the TMDB cache before loading credits for each show',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Only print shows that would be processed',
        )

    def handle(self, *args, **options):
        run_show_cast_sync(
            limit=options['limit'],
            start_id=options['start_id'],
            delay=options['delay'],
            force=options['force'],
            dry_run=options['dry_run'],
            output_callback=self.write_output,
        )

    def write_output(self, level, message):
        stream = self.stderr if level == 'error' else self.stdout
        style = {
            'success': self.style.SUCCESS,
            'warning': self.style.WARNING,
            'error': self.style.ERROR,
        }.get(level, str)
        stream.write(style(message))
