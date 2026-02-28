import time

from django.core.management.base import BaseCommand

from games.igdb import query_igdb_games, rank_igdb_matches
from games.models import Game


class Command(BaseCommand):
    help = 'Find and save IGDB matches for local games without igdb_id'

    MIN_REQUEST_INTERVAL_SECONDS = 0.26  # <= 4 requests per second

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=20,
            help='Max candidates requested from IGDB for each game (default: 20)',
        )
        parser.add_argument(
            '--min-score',
            type=float,
            default=92.0,
            help='Minimum reliability score for accepting top match (default: 92)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Do not save results to DB',
        )
        parser.add_argument(
            '--include-not-found',
            action='store_true',
            help='Also retry games already marked with igdb_name="Not Found"',
        )

    def handle(self, *args, **options):
        dry_run = bool(options['dry_run'])
        candidate_limit = int(options['limit'])
        min_score = float(options['min_score'])
        include_not_found = bool(options['include_not_found'])

        games_qs = Game.objects.filter(igdb_id__isnull=True).order_by('id')
        if not include_not_found:
            games_qs = games_qs.exclude(igdb_name='Not Found')
        games = list(games_qs)

        total = len(games)
        if total == 0:
            self.stdout.write(self.style.WARNING('No games to process'))
            return

        self.stdout.write(f'Starting IGDB sync for {total} games (dry_run={dry_run})')
        started_at = time.time()
        last_request_at = 0.0
        matched_count = 0
        not_found_count = 0
        error_count = 0

        for index, game in enumerate(games, start=1):
            prefix = f'[{index}/{total}] game_id={game.id} slug={game.rawg_slug}'
            release_year = game.rawg_release_date.year if game.rawg_release_date else None

            now = time.time()
            wait_for = self.MIN_REQUEST_INTERVAL_SECONDS - (now - last_request_at)
            if wait_for > 0:
                time.sleep(wait_for)

            try:
                candidates = query_igdb_games(game.rawg_name, limit=candidate_limit)
                last_request_at = time.time()
            except Exception as exc:
                error_count += 1
                self.stdout.write(self.style.ERROR(f'{prefix} ERROR request failed: {exc}'))
                continue

            ranked = rank_igdb_matches(
                game_name=game.rawg_name,
                game_slug=game.rawg_slug,
                game_release_year=release_year,
                candidates=candidates,
            )

            best = ranked[0] if ranked else None
            second = ranked[1] if len(ranked) > 1 else None

            is_reliable = self._is_reliable(best, second, min_score)
            if is_reliable:
                candidate = best['candidate']
                match_id = candidate.get('id')
                match_name = candidate.get('name') or ''
                match_slug = candidate.get('slug') or ''
                match_year = best.get('release_year')

                matched_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'{prefix} MATCH score={best["score"]:.2f} '
                        f'igdb_id={match_id} name="{match_name}"'
                    )
                )

                if not dry_run:
                    game.igdb_id = match_id
                    game.igdb_name = match_name
                    game.igdb_slug = match_slug
                    game.igdb_year = match_year
                    game.save(update_fields=('igdb_id', 'igdb_name', 'igdb_slug', 'igdb_year'))
            else:
                not_found_count += 1
                score_info = f'{best["score"]:.2f}' if best else 'n/a'
                self.stdout.write(self.style.WARNING(f'{prefix} NOT_FOUND top_score={score_info}'))
                if not dry_run:
                    game.igdb_id = None
                    game.igdb_name = 'Not Found'
                    game.igdb_slug = ''
                    game.igdb_year = None
                    game.save(update_fields=('igdb_id', 'igdb_name', 'igdb_slug', 'igdb_year'))

        duration = time.time() - started_at
        self.stdout.write(
            self.style.SUCCESS(
                f'IGDB sync done in {duration:.1f}s: '
                f'matched={matched_count}, not_found={not_found_count}, errors={error_count}, total={total}'
            )
        )

    @staticmethod
    def _is_reliable(best, second, min_score: float) -> bool:
        if not best:
            return False
        if best['score'] >= 97:
            return True
        if best['score'] < min_score:
            return False

        if second is None:
            return True

        gap = best['score'] - second['score']
        return gap >= 6
