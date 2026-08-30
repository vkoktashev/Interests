import tmdbsimple as tmdb
from django.core.cache import cache
from requests import HTTPError

from people.models import Person
from utils.constants import CACHE_TIMEOUT, LANGUAGE, TMDB_POSTER_PATH_PREFIX


def search_people(query, page):
    if not query:
        return [], 0

    try:
        results = _get_people_search_results(query=query, page=page)
    except HTTPError:
        results = {'results': [], 'total_results': 0}

    people = []
    for result in results.get('results', []):
        person = _upsert_search_result(result)
        if person is None:
            continue
        people.append({
            'person': person,
            'known_for_department': result.get('known_for_department') or '',
            'known_for': result.get('known_for'),
        })

    return people, results.get('total_results') or len(people)


def _get_people_search_results(query, page):
    key = f'tmdb_people_search_{query.replace(" ", "_")}_page_{page}'
    results = cache.get(key, None)
    if results is None:
        results = tmdb.Search().person(query=query, page=page, language=LANGUAGE)
        cache.set(key, results, CACHE_TIMEOUT)
    return results


def _upsert_search_result(result):
    tmdb_id = result.get('id')
    name = (result.get('name') or '').strip()
    if not tmdb_id or not name:
        return None

    profile_path = (
        TMDB_POSTER_PATH_PREFIX + result.get('profile_path')
        if result.get('profile_path')
        else ''
    )
    person, created = Person.objects.get_or_create(
        tmdb_id=tmdb_id,
        defaults={
            'name': name,
            'tmdb_popularity': result.get('popularity'),
            'tmdb_profile_path': profile_path,
        },
    )
    if created:
        return person

    update_fields = []
    if person.name != name:
        person.name = name
        update_fields.append('name')
    if result.get('popularity') is not None and person.tmdb_popularity != result.get('popularity'):
        person.tmdb_popularity = result.get('popularity')
        update_fields.append('tmdb_popularity')
    if profile_path and person.tmdb_profile_path != profile_path:
        person.tmdb_profile_path = profile_path
        update_fields.append('tmdb_profile_path')
    if update_fields:
        person.save(update_fields=update_fields)
    return person
