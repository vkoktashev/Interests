from datetime import datetime

from django.core.cache import cache
from django.utils import timezone
import tmdbsimple as tmdb

from movies.models import Genre, MovieGenre, MoviePerson
from people.models import Person
from utils.constants import TMDB_BACKDROP_PATH_PREFIX, TMDB_POSTER_PATH_PREFIX, LANGUAGE, CACHE_TIMEOUT, \
    TMDB_TRAILER_TYPE, TMDB_VIDEO_LANGUAGES
from utils.functions import get_english_translation_data


TMDB_DIGITAL_RELEASE_TYPE = 4


def get_digital_release_date(tmdb_release_dates):
    digital_release_dates = []

    for country in (tmdb_release_dates or {}).get('results') or []:
        for release in country.get('release_dates') or []:
            if release.get('type') != TMDB_DIGITAL_RELEASE_TYPE or not release.get('release_date'):
                continue

            try:
                release_date = datetime.fromisoformat(release['release_date'].replace('Z', '+00:00')).date()
            except (TypeError, ValueError):
                continue
            digital_release_dates.append(release_date)

    return min(digital_release_dates, default=None)


def get_movie_new_fields(tmdb_movie, tmdb_release_dates=None):
    english_translation = get_english_translation_data(tmdb_movie)

    result = {
        'imdb_id': tmdb_movie.get('imdb_id') if tmdb_movie.get('imdb_id') is not None else '',
        'tmdb_original_name': tmdb_movie.get('original_title'),
        'tmdb_name': tmdb_movie.get('title'),
        'tmdb_name_en': english_translation.get('title') or '',
        'tmdb_original_language': tmdb_movie.get('original_language') or '',
        'tmdb_runtime': tmdb_movie.get('runtime') if tmdb_movie.get('runtime') is not None else 0,
        'tmdb_release_date': tmdb_movie.get('release_date') if tmdb_movie.get('release_date') != "" else None,
        'tmdb_digital_release_date': get_digital_release_date(tmdb_release_dates),
        'tmdb_backdrop_path': TMDB_BACKDROP_PATH_PREFIX + tmdb_movie['backdrop_path']
        if tmdb_movie.get('backdrop_path') is not None else '',
        'tmdb_poster_path': TMDB_POSTER_PATH_PREFIX + tmdb_movie['poster_path']
        if tmdb_movie.get('poster_path') is not None else '',
        'tmdb_overview': tmdb_movie.get('overview') or '',
        'tmdb_overview_en': english_translation.get('overview') or '',
        'tmdb_score': int(tmdb_movie['vote_average'] * 10) if tmdb_movie.get('vote_average') else None,
        'tmdb_tagline': tmdb_movie.get('tagline') or '',
        'tmdb_production_companies': ', '.join(company.get('name', '') for company in (tmdb_movie.get('production_companies') or []) if company.get('name')),
        'tmdb_last_update': timezone.now()
    }

    return result


# cache keys
def get_tmdb_movie_key(tmdb_id):
    return f'movie_{tmdb_id}'


def clear_tmdb_movie_cache(tmdb_id):
    cache.delete_many((
        get_tmdb_movie_key(tmdb_id),
        f'movie_{tmdb_id}_details_{TMDB_VIDEO_LANGUAGES.replace(",", "_")}',
        f'movie_{tmdb_id}_videos',
        f'movie_{tmdb_id}_videos_{TMDB_VIDEO_LANGUAGES.replace(",", "_")}',
        f'movie_{tmdb_id}_videos_{TMDB_VIDEO_LANGUAGES.replace(",", "_")}_v2',
        f'movie_{tmdb_id}_trailers_{TMDB_VIDEO_LANGUAGES.replace(",", "_")}',
        f'movie_{tmdb_id}_release_dates',
        f'movie_{tmdb_id}_cast_crew',
    ))


def get_tmdb_movie(tmdb_id):
    key = get_tmdb_movie_key(tmdb_id)
    tmdb_movie = cache.get(key, None)
    if tmdb_movie is None:
        tmdb_movie = tmdb.Movies(tmdb_id).info(language=LANGUAGE, append_to_response='videos,credits,translations')
        cache.set(key, tmdb_movie, CACHE_TIMEOUT)
    return tmdb_movie


def get_tmdb_movie_videos(tmdb_id):
    key = f'movie_{tmdb_id}_trailers_{TMDB_VIDEO_LANGUAGES.replace(",", "_")}'
    tmdb_movie_videos = cache.get(key, None)
    if tmdb_movie_videos is not None:
        return tmdb_movie_videos

    cached_movie = cache.get(get_tmdb_movie_key(tmdb_id), None)
    cached_russian_videos = None
    if cached_movie is not None:
        cached_russian_videos = (cached_movie.get('videos') or {}).get('results')

    tmdb_movie_videos = []
    video_keys = set()
    for language in TMDB_VIDEO_LANGUAGES.split(','):
        language_videos = cached_russian_videos if language == LANGUAGE else None
        if language_videos is None:
            language_videos = tmdb.Movies(tmdb_id).videos(language=language)['results']

        for video in language_videos:
            if video.get('type') != TMDB_TRAILER_TYPE:
                continue
            video_key = (video.get('site'), video.get('key'))
            if video_key in video_keys:
                continue
            video_keys.add(video_key)
            tmdb_movie_videos.append(video)

    cache.set(key, tmdb_movie_videos, CACHE_TIMEOUT)
    return tmdb_movie_videos


def get_tmdb_movie_release_dates(tmdb_id):
    key = f'movie_{tmdb_id}_release_dates'
    tmdb_release_dates = cache.get(key, None)
    if tmdb_release_dates is None:
        tmdb_release_dates = tmdb.Movies(tmdb_id).release_dates()
        cache.set(key, tmdb_release_dates, CACHE_TIMEOUT)
    return tmdb_release_dates


def get_cast_crew(tmdb_id):
    cached_movie = cache.get(get_tmdb_movie_key(tmdb_id), None)
    if cached_movie is not None and cached_movie.get('credits') is not None:
        return cached_movie.get('credits')

    key = f'movie_{tmdb_id}_cast_crew'
    tmdb_cast_crew = cache.get(key, None)
    if tmdb_cast_crew is None:
        tmdb_cast_crew = tmdb.Movies(tmdb_id).credits(language=LANGUAGE)
        cache.set(key, tmdb_cast_crew, CACHE_TIMEOUT)
    return tmdb_cast_crew


def get_tmdb_movie_recommendations(tmdb_id, page=1):
    key = f'movie_{tmdb_id}_recommendations_{LANGUAGE.replace("-", "_")}_{page}'
    tmdb_recommendations = cache.get(key, None)
    if tmdb_recommendations is None:
        tmdb_recommendations = tmdb.Movies(tmdb_id).recommendations(language=LANGUAGE, page=page)
        cache.set(key, tmdb_recommendations, CACHE_TIMEOUT)

    return tmdb_recommendations or {'page': page, 'total_pages': 1, 'total_results': 0, 'results': []}


def update_movie_genres(movie, tmdb_movie):
    existing_movie_genres = MovieGenre.objects.filter(movie=movie)
    new_movie_genres = []
    movie_genres_to_delete_ids = []

    for genre in tmdb_movie.get('genres') or []:
        genre_obj, _ = Genre.objects.get_or_create(tmdb_id=genre.get('id'),
                                                   defaults={
                                                       'tmdb_name': genre.get('name')
                                                   })
        movie_genre_obj, _ = MovieGenre.objects.get_or_create(genre=genre_obj, movie=movie)
        new_movie_genres.append(movie_genre_obj)

    for existing_movie_genre in existing_movie_genres:
        if existing_movie_genre not in new_movie_genres:
            movie_genres_to_delete_ids.append(existing_movie_genre.id)

    MovieGenre.objects.filter(id__in=movie_genres_to_delete_ids).delete()


def update_movie_people(movie, tmdb_cast_crew):
    cast = tmdb_cast_crew.get('cast') or []
    crew = tmdb_cast_crew.get('crew') or []
    directors = [person for person in crew if person.get('job') == 'Director']

    new_links = []
    links_to_delete_ids = []
    existing_links = MoviePerson.objects.filter(movie=movie).select_related('person')

    for index, person_data in enumerate(cast):
        person_id = person_data.get('id')
        person_name = person_data.get('name')
        if person_id is None or not person_name:
            continue

        tmdb_order = person_data.get('order')
        sort_order = tmdb_order if isinstance(tmdb_order, int) and tmdb_order >= 0 else index

        profile_path = (
            TMDB_POSTER_PATH_PREFIX + person_data.get('profile_path')
            if person_data.get('profile_path')
            else ''
        )
        person_obj, _ = Person.objects.get_or_create(
            tmdb_id=person_id,
            defaults={'name': person_name, 'tmdb_profile_path': profile_path},
        )
        person_fields_to_update = []
        if person_obj.name != person_name:
            person_obj.name = person_name
            person_fields_to_update.append('name')
        if profile_path and person_obj.tmdb_profile_path != profile_path:
            person_obj.tmdb_profile_path = profile_path
            person_fields_to_update.append('tmdb_profile_path')
        if person_fields_to_update:
            person_obj.save(update_fields=person_fields_to_update)

        movie_person, _ = MoviePerson.objects.get_or_create(
            movie=movie,
            person=person_obj,
            role=MoviePerson.ROLE_ACTOR,
            defaults={
                'character': person_data.get('character') or '',
                'sort_order': sort_order,
            }
        )
        relation_fields_to_update = []
        character = person_data.get('character') or ''
        if movie_person.character != character:
            movie_person.character = character
            relation_fields_to_update.append('character')
        if movie_person.sort_order != sort_order:
            movie_person.sort_order = sort_order
            relation_fields_to_update.append('sort_order')
        if relation_fields_to_update:
            movie_person.save(update_fields=relation_fields_to_update)
        new_links.append(movie_person)

    for index, person_data in enumerate(directors):
        person_id = person_data.get('id')
        person_name = person_data.get('name')
        if person_id is None or not person_name:
            continue

        profile_path = (
            TMDB_POSTER_PATH_PREFIX + person_data.get('profile_path')
            if person_data.get('profile_path')
            else ''
        )
        person_obj, _ = Person.objects.get_or_create(
            tmdb_id=person_id,
            defaults={'name': person_name, 'tmdb_profile_path': profile_path},
        )
        person_fields_to_update = []
        if person_obj.name != person_name:
            person_obj.name = person_name
            person_fields_to_update.append('name')
        if profile_path and person_obj.tmdb_profile_path != profile_path:
            person_obj.tmdb_profile_path = profile_path
            person_fields_to_update.append('tmdb_profile_path')
        if person_fields_to_update:
            person_obj.save(update_fields=person_fields_to_update)

        movie_person, _ = MoviePerson.objects.get_or_create(
            movie=movie,
            person=person_obj,
            role=MoviePerson.ROLE_DIRECTOR,
            defaults={'sort_order': index}
        )
        if movie_person.sort_order != index:
            movie_person.sort_order = index
            movie_person.save(update_fields=('sort_order',))
        new_links.append(movie_person)

    for existing_link in existing_links:
        if existing_link not in new_links:
            links_to_delete_ids.append(existing_link.id)

    MoviePerson.objects.filter(id__in=links_to_delete_ids).delete()
