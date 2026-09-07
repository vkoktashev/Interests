import logging
import unicodedata

from django.db import transaction

from integrations.exceptions import ExternalUnavailableError
from integrations.poiskkino import POISKKINO_PROVIDER, get_kinopoisk_top250
from integrations.tmdb import TmdbNotFoundError
from movies.functions import find_tmdb_movie_by_imdb_id
from movies.models import Movie
from movies.services.catalog import MovieNotFoundError, get_movie_for_detail
from movies.services.discovery import search_tmdb_movies

from content_collections.models import Collection, CollectionItemOrder


KINOPOISK_TOP250_SYSTEM_KEY = 'kinopoisk-top-250'
KINOPOISK_TOP250_MIN_ITEMS = 200
KINOPOISK_TOP250_SYNC_TIMEOUT = 60 * 60 * 4
KINOPOISK_TOP250_YEAR_TOLERANCE = 2

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
        tmdb_id = (
            ranked_movie.tmdb_id
            or _find_tmdb_id_by_imdb(ranked_movie.imdb_id)
            or _find_tmdb_id_by_title(ranked_movie)
        )
        if tmdb_id is None or tmdb_id in seen_tmdb_ids:
            skipped_count += 1
            logger.warning(
                'kinopoisk_top250: skipped position=%s kinopoisk_id=%s imdb_id=%s name=%s year=%s reason=%s',
                ranked_movie.position,
                ranked_movie.kinopoisk_id,
                ranked_movie.imdb_id,
                ranked_movie.name,
                ranked_movie.year,
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


def _find_tmdb_id_by_imdb(imdb_id):
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


def _find_tmdb_id_by_title(ranked_movie):
    expected_titles = {
        _normalize_title(title)
        for title in (ranked_movie.name, ranked_movie.alternative_name)
        if title
    }
    if not expected_titles:
        return None

    queries = dict.fromkeys(filter(None, (ranked_movie.alternative_name, ranked_movie.name)))
    for query in queries:
        result = search_tmdb_movies(query, 1)
        candidates = result.get('results') if isinstance(result, dict) else None
        best_match = None
        for result_position, candidate in enumerate(candidates or []):
            if not isinstance(candidate, dict):
                continue

            candidate_titles = {
                _normalize_title(title)
                for title in (candidate.get('title'), candidate.get('original_title'))
                if title
            }
            if expected_titles.isdisjoint(candidate_titles):
                continue

            year_distance = _get_year_distance(
                ranked_movie.year,
                candidate.get('release_date'),
            )
            if year_distance is None or year_distance > KINOPOISK_TOP250_YEAR_TOLERANCE:
                continue

            tmdb_id = _positive_int(candidate.get('id'))
            if tmdb_id is None:
                continue

            match = (year_distance, result_position, tmdb_id)
            if best_match is None or match < best_match:
                best_match = match
        if best_match is not None:
            tmdb_id = best_match[2]
            logger.info(
                'kinopoisk_top250: matched by title kinopoisk_id=%s tmdb_id=%s name=%s year=%s',
                ranked_movie.kinopoisk_id,
                tmdb_id,
                ranked_movie.name,
                ranked_movie.year,
            )
            return tmdb_id

    return None


def _normalize_title(value):
    value = unicodedata.normalize('NFKD', value.casefold().replace('ё', 'е'))
    return ''.join(character for character in value if character.isalnum())


def _get_year_distance(expected_year, release_date):
    if expected_year is None:
        return 0
    if not isinstance(release_date, str) or len(release_date) < 4:
        return None
    try:
        release_year = int(release_date[:4])
    except ValueError:
        return None
    return abs(expected_year - release_year)


def _positive_int(value):
    try:
        value = int(value)
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None


@transaction.atomic
def _replace_collection_movies(movies):
    collection = Collection.objects.select_for_update().get(
        system_key=KINOPOISK_TOP250_SYSTEM_KEY,
    )
    collection.games.clear()
    collection.shows.clear()
    collection.movies.set(movies)
    captions = dict(collection.item_orders.filter(media_type='movie').values_list('object_id', 'caption'))
    collection.item_orders.all().delete()
    CollectionItemOrder.objects.bulk_create([
        CollectionItemOrder(
            collection=collection,
            media_type=CollectionItemOrder.MEDIA_TYPE_MOVIE,
            object_id=movie.pk,
            position=position,
            caption=captions.get(movie.pk, ''),
        )
        for position, movie in enumerate(movies)
    ])
    collection.save(update_fields=('updated_at',))
