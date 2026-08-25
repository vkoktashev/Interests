import time

from django.core.management.base import BaseCommand
from django.db import transaction

from movies.functions import clear_tmdb_movie_cache, get_cast_crew, update_movie_people
from movies.models import Movie


class Command(BaseCommand):
    help = 'Synchronize the full TMDB cast and directors for all movies'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Limit number of movies to process (0 = no limit)',
        )
        parser.add_argument(
            '--start-id',
            type=int,
            default=0,
            help='Process movies starting from this database ID',
        )
        parser.add_argument(
            '--delay',
            type=float,
            default=0.25,
            help='Minimum delay between movies in seconds (default: 0.25)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Clear the TMDB cache before loading credits for each movie',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Only print movies that would be processed',
        )

    def handle(self, *args, **options):
        limit = max(int(options['limit']), 0)
        start_id = max(int(options['start_id']), 0)
        delay = max(float(options['delay']), 0.0)
        force = bool(options['force'])
        dry_run = bool(options['dry_run'])

        movies = Movie.objects.order_by('id')
        if start_id:
            movies = movies.filter(id__gte=start_id)
        if limit:
            movies = movies[:limit]

        total = movies.count()
        if total == 0:
            self.stdout.write(self.style.WARNING('No movies to process'))
            return

        self.stdout.write(
            f'Starting TMDB cast sync for {total} movies '
            f'(dry_run={dry_run}, force={force}, delay={delay:.2f}s)'
        )

        started_at = time.monotonic()
        updated_count = 0
        error_count = 0

        for index, movie in enumerate(movies.iterator(chunk_size=100), start=1):
            prefix = f'[{index}/{total}] movie_id={movie.id} tmdb_id={movie.tmdb_id}'

            if dry_run:
                self.stdout.write(f'{prefix} WOULD_UPDATE')
                continue

            if index > 1 and delay:
                time.sleep(delay)

            try:
                if force:
                    clear_tmdb_movie_cache(movie.tmdb_id)

                tmdb_cast_crew = get_cast_crew(movie.tmdb_id)
                with transaction.atomic():
                    update_movie_people(movie, tmdb_cast_crew)

                cast_count = len(tmdb_cast_crew.get('cast') or [])
                director_count = sum(
                    1
                    for person in (tmdb_cast_crew.get('crew') or [])
                    if person.get('job') == 'Director'
                )
                updated_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'{prefix} UPDATED cast={cast_count} directors={director_count}'
                    )
                )
            except Exception as exc:
                error_count += 1
                self.stderr.write(self.style.ERROR(f'{prefix} ERROR {exc}'))

        duration = time.monotonic() - started_at
        self.stdout.write(
            self.style.SUCCESS(
                f'TMDB cast sync finished in {duration:.1f}s: '
                f'updated={updated_count}, errors={error_count}, total={total}'
            )
        )
