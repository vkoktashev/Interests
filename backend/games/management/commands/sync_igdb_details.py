import time

from django.core.management.base import BaseCommand
from games.models import Game
from games.tasks import refresh_game_details


class Command(BaseCommand):
    help = 'Update IGDB detailed fields for games where details are missing'

    MIN_REQUEST_INTERVAL_SECONDS = 0.30  # <= 4 requests per second

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Limit number of games to process (0 = no limit)',
        )
        parser.add_argument(
            '--include-not-found',
            action='store_true',
            help='Also process games marked as igdb_name="Not Found"',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Only print what would be processed, do not call IGDB refresh',
        )

    def handle(self, *args, **options):
        limit = max(int(options['limit']), 0)
        include_not_found = bool(options['include_not_found'])
        dry_run = bool(options['dry_run'])

        games_qs = Game.objects.filter(igdb_last_update__isnull=True).order_by('id')
        if not include_not_found:
            games_qs = games_qs.exclude(igdb_name='Not Found')
        if limit:
            games_qs = games_qs[:limit]

        games = list(games_qs)
        total = len(games)
        if total == 0:
            self.stdout.write(self.style.WARNING('No games without IGDB details'))
            return

        self.stdout.write(
            f'Starting IGDB details sync for {total} games '
            f'(dry_run={dry_run}, min_interval={self.MIN_REQUEST_INTERVAL_SECONDS:.2f}s)'
        )

        started_at = time.time()
        last_request_at = 0.0
        updated_count = 0
        skipped_count = 0
        error_count = 0

        for index, game in enumerate(games, start=1):
            slug = (game.rawg_slug or '').strip()
            prefix = f'[{index}/{total}] game_id={game.id} slug={slug or "-"}'

            if not slug:
                skipped_count += 1
                self.stdout.write(self.style.WARNING(f'{prefix} SKIP empty slug'))
                continue

            if dry_run:
                self.stdout.write(f'{prefix} WOULD_UPDATE')
                continue

            now = time.time()
            wait_for = self.MIN_REQUEST_INTERVAL_SECONDS - (now - last_request_at)
            if wait_for > 0:
                time.sleep(wait_for)

            try:
                refresh_game_details(slug)
                last_request_at = time.time()
                updated_count += 1
                self.stdout.write(self.style.SUCCESS(f'{prefix} UPDATED'))
            except Exception as exc:
                error_count += 1
                self.stdout.write(self.style.ERROR(f'{prefix} ERROR {exc}'))

        duration = time.time() - started_at
        self.stdout.write(
            self.style.SUCCESS(
                f'IGDB details sync done in {duration:.1f}s: '
                f'updated={updated_count}, skipped={skipped_count}, errors={error_count}, total={total}'
            )
        )
