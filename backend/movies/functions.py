from django.core.cache import cache
from django.utils import timezone
import tmdbsimple as tmdb

from movies.models import Genre, MovieGenre, MoviePerson
from people.models import Person
from utils.constants import TMDB_BACKDROP_PATH_PREFIX, TMDB_POSTER_PATH_PREFIX, LANGUAGE, CACHE_TIMEOUT, YOUTUBE_PREFIX


def get_movie_new_fields(tmdb_movie, tmdb_movie_videos=None):
    parsed_videos = []
    if tmdb_movie_videos is not None:
        youtube_videos = [video for video in tmdb_movie_videos if video.get('site') == 'YouTube']
        parsed_videos = [{
            'name': video.get('name'),
            'url': YOUTUBE_PREFIX + video.get('key', '')
        } for video in youtube_videos if video.get('key')]

    result = {
        'imdb_id': tmdb_movie.get('imdb_id') if tmdb_movie.get('imdb_id') is not None else '',
        'tmdb_original_name': tmdb_movie.get('original_title'),
        'tmdb_name': tmdb_movie.get('title'),
        'tmdb_runtime': tmdb_movie.get('runtime') if tmdb_movie.get('runtime') is not None else 0,
        'tmdb_release_date': tmdb_movie.get('release_date') if tmdb_movie.get('release_date') != "" else None,
        'tmdb_backdrop_path': TMDB_BACKDROP_PATH_PREFIX + tmdb_movie['backdrop_path']
        if tmdb_movie.get('backdrop_path') is not None else '',
        'tmdb_poster_path': TMDB_POSTER_PATH_PREFIX + tmdb_movie['poster_path']
        if tmdb_movie.get('poster_path') is not None else '',
        'tmdb_overview': tmdb_movie.get('overview') or '',
        'tmdb_score': int(tmdb_movie['vote_average'] * 10) if tmdb_movie.get('vote_average') else None,
        'tmdb_tagline': tmdb_movie.get('tagline') or '',
        'tmdb_production_companies': ', '.join(company.get('name', '') for company in (tmdb_movie.get('production_companies') or []) if company.get('name')),
        'tmdb_videos': parsed_videos,
        'tmdb_last_update': timezone.now()
    }

    return result


# cache keys
def get_tmdb_movie_key(tmdb_id):
    return f'movie_{tmdb_id}'


def get_tmdb_movie(tmdb_id):
    key = get_tmdb_movie_key(tmdb_id)
    tmdb_movie = cache.get(key, None)
    if tmdb_movie is None:
        tmdb_movie = tmdb.Movies(tmdb_id).info(language=LANGUAGE)
        cache.set(key, tmdb_movie, CACHE_TIMEOUT)
    return tmdb_movie


def get_tmdb_movie_videos(tmdb_id):
    key = f'movie_{tmdb_id}_videos'
    tmdb_movie_videos = cache.get(key, None)
    if tmdb_movie_videos is None:
        tmdb_movie_videos = tmdb.Movies(tmdb_id).videos(language=LANGUAGE)['results']
        cache.set(key, tmdb_movie_videos, CACHE_TIMEOUT)
    return tmdb_movie_videos


def get_cast_crew(tmdb_id):
    key = f'movie_{tmdb_id}_cast_crew'
    tmdb_cast_crew = cache.get(key, None)
    if tmdb_cast_crew is None:
        tmdb_cast_crew = tmdb.Movies(tmdb_id).credits(language=LANGUAGE)
        cache.set(key, tmdb_cast_crew, CACHE_TIMEOUT)
    return tmdb_cast_crew


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
    cast = (tmdb_cast_crew.get('cast') or [])[:5]
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

        person_obj, _ = Person.objects.get_or_create(tmdb_id=person_id,
                                                     defaults={'name': person_name})
        if person_obj.name != person_name:
            person_obj.name = person_name
            person_obj.save(update_fields=('name',))

        movie_person, _ = MoviePerson.objects.get_or_create(
            movie=movie,
            person=person_obj,
            role=MoviePerson.ROLE_ACTOR,
            defaults={'sort_order': index}
        )
        if movie_person.sort_order != index:
            movie_person.sort_order = index
            movie_person.save(update_fields=('sort_order',))
        new_links.append(movie_person)

    for index, person_data in enumerate(directors):
        person_id = person_data.get('id')
        person_name = person_data.get('name')
        if person_id is None or not person_name:
            continue

        person_obj, _ = Person.objects.get_or_create(tmdb_id=person_id,
                                                     defaults={'name': person_name})
        if person_obj.name != person_name:
            person_obj.name = person_name
            person_obj.save(update_fields=('name',))

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
