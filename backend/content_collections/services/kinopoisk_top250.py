import logging

from django.db import transaction

from integrations.exceptions import ExternalUnavailableError
from integrations.poiskkino import POISKKINO_PROVIDER, get_kinopoisk_top250
from integrations.tmdb import TmdbNotFoundError
from movies.functions import find_tmdb_movie_by_imdb_id
from movies.models import Movie
from movies.services.catalog import MovieNotFoundError, get_movie_for_detail

from content_collections.models import Collection, CollectionItemOrder


KINOPOISK_TOP250_SYSTEM_KEY = 'kinopoisk-top-250'
KINOPOISK_TOP250_MIN_ITEMS = 200

logger = logging.getLogger(__name__)


def sync_kinopoisk_top250():
    ranked_movies = get_kinopoisk_top250()
    if len(ranked_movies) < KINOPOISK_TOP250_MIN_ITEMS:
        raise ExternalUnavailableError(
            POISKKINO_PROVIDER,
            message=f'poiskkino.dev returned only {len(ranked_movies)} Top 250 entries',
        )

    movies = []
    seen_tmdb_ids = set()
    skipped_count = 0
    loaded_count = 0
    for ranked_movie in ranked_movies:
        tmdb_id = ranked_movie.tmdb_id or _find_tmdb_id(ranked_movie.imdb_id)
        if tmdb_id is None or tmdb_id in seen_tmdb_ids:
            skipped_count += 1
            logger.warning(
                'kinopoisk_top250: skipped position=%s kinopoisk_id=%s imdb_id=%s reason=%s',
                ranked_movie.position,
                ranked_movie.kinopoisk_id,
                ranked_movie.imdb_id,
                'tmdb_not_found' if tmdb_id is None else 'duplicate_tmdb_id',
            )
            continue

        movie = Movie.objects.filter(tmdb_id=tmdb_id).first()
        if movie is None or movie.tmdb_last_update is None:
            try:
                movie, _ = get_movie_for_detail(tmdb_id)
            except MovieNotFoundError:
                skipped_count += 1
                logger.warning(
                    'kinopoisk_top250: skipped position=%s kinopoisk_id=%s tmdb_id=%s reason=tmdb_movie_not_found',
                    ranked_movie.position,
                    ranked_movie.kinopoisk_id,
                    tmdb_id,
                )
                continue
            loaded_count += 1

        seen_tmdb_ids.add(tmdb_id)
        movies.append(movie)

    if len(movies) < KINOPOISK_TOP250_MIN_ITEMS:
        raise ExternalUnavailableError(
            POISKKINO_PROVIDER,
            message=f'Only {len(movies)} Top 250 movies could be matched with TMDB',
        )

    _replace_collection_movies(movies)
    logger.info(
        'kinopoisk_top250: synchronized movies=%s loaded=%s skipped=%s',
        len(movies),
        loaded_count,
        skipped_count,
    )
    return {
        'movies': len(movies),
        'loaded': loaded_count,
        'skipped': skipped_count,
    }


def _find_tmdb_id(imdb_id):
    if not imdb_id:
        return None

    try:
        result = find_tmdb_movie_by_imdb_id(imdb_id)
    except TmdbNotFoundError:
        return None

    movie_results = result.get('movie_results') if isinstance(result, dict) else None
    if not movie_results:
        return None
    try:
        tmdb_id = int(movie_results[0].get('id'))
    except (AttributeError, TypeError, ValueError):
        return None
    return tmdb_id if tmdb_id > 0 else None


@transaction.atomic
def _replace_collection_movies(movies):
    collection = Collection.objects.select_for_update().get(
        system_key=KINOPOISK_TOP250_SYSTEM_KEY,
    )
    collection.games.clear()
    collection.shows.clear()
    collection.movies.set(movies)
    collection.item_orders.all().delete()
    CollectionItemOrder.objects.bulk_create([
        CollectionItemOrder(
            collection=collection,
            media_type=CollectionItemOrder.MEDIA_TYPE_MOVIE,
            object_id=movie.pk,
            position=position,
        )
        for position, movie in enumerate(movies)
    ])
    collection.save(update_fields=('updated_at',))
