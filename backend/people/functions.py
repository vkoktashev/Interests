from django.core.cache import cache
from django.utils import timezone
import tmdbsimple as tmdb

from people.models import Person
from utils.constants import CACHE_TIMEOUT, LANGUAGE, TMDB_POSTER_PATH_PREFIX
from utils.functions import update_fields_if_needed

PERSON_MOVIE_CREDITS_CACHE_TIMEOUT = 60 * 60 * 24
PERSON_TV_CREDITS_CACHE_TIMEOUT = 60 * 60 * 24


def get_tmdb_person_key(tmdb_id):
    return f'person_{tmdb_id}'


def get_tmdb_person(tmdb_id):
    key = get_tmdb_person_key(tmdb_id)
    tmdb_person = cache.get(key, None)
    if tmdb_person is None:
        tmdb_person = tmdb.People(tmdb_id).info(language=LANGUAGE, append_to_response='external_ids')
        cache.set(key, tmdb_person, CACHE_TIMEOUT)
    return tmdb_person


def get_tmdb_person_movie_credits(tmdb_id):
    key = f'person_{tmdb_id}_movie_credits'
    movie_credits = cache.get(key, None)
    if movie_credits is None:
        movie_credits = tmdb.People(tmdb_id).movie_credits(language=LANGUAGE)
        cache.set(key, movie_credits, PERSON_MOVIE_CREDITS_CACHE_TIMEOUT)
    return movie_credits or {'cast': [], 'crew': []}


def get_tmdb_person_tv_credits(tmdb_id):
    key = f'person_{tmdb_id}_tv_credits'
    tv_credits = cache.get(key, None)
    if tv_credits is None:
        tv_credits = tmdb.People(tmdb_id).tv_credits(language=LANGUAGE)
        cache.set(key, tv_credits, PERSON_TV_CREDITS_CACHE_TIMEOUT)
    return tv_credits or {'cast': [], 'crew': []}


def get_person_new_fields(tmdb_person):
    external_ids = tmdb_person.get('external_ids') or {}
    also_known_as = tmdb_person.get('also_known_as') or []
    normalized_also_known_as = [str(item).strip() for item in also_known_as if str(item).strip()]
    return {
        'name': tmdb_person.get('name') or '',
        'imdb_id': external_ids.get('imdb_id') or '',
        'tmdb_popularity': tmdb_person.get('popularity'),
        'tmdb_also_known_as': normalized_also_known_as,
        'tmdb_birthday': tmdb_person.get('birthday') or None,
        'tmdb_deathday': tmdb_person.get('deathday') or None,
        'tmdb_biography': tmdb_person.get('biography') or '',
        'tmdb_place_of_birth': tmdb_person.get('place_of_birth') or '',
        'tmdb_profile_path': (
            TMDB_POSTER_PATH_PREFIX + tmdb_person.get('profile_path')
            if tmdb_person.get('profile_path')
            else ''
        ),
        'tmdb_last_update': timezone.now(),
    }


def update_person_details(person, tmdb_person):
    new_fields = get_person_new_fields(tmdb_person)
    update_fields_if_needed(person, new_fields)
    return person


def fetch_and_upsert_person(tmdb_id):
    tmdb_person = get_tmdb_person(tmdb_id)
    defaults = get_person_new_fields(tmdb_person)
    person, created = Person.objects.get_or_create(
        tmdb_id=tmdb_id,
        defaults=defaults,
    )
    if not created:
        update_person_details(person, tmdb_person)
    return person
