import tmdbsimple as tmdb
from django.core.cache import cache
from requests import HTTPError
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from people.models import Person
from proxy.functions import get_proxy_url
from utils.constants import CACHE_TIMEOUT, DEFAULT_PAGE_NUMBER, LANGUAGE, TMDB_POSTER_PATH_PREFIX
from utils.swagger import openapi, swagger_auto_schema


class SearchPeopleViewSet(GenericViewSet):
    @swagger_auto_schema(
        operation_description='Search for people using the TMDB API.',
        manual_parameters=[
            openapi.Parameter('query', openapi.IN_QUERY, type=openapi.TYPE_STRING),
            openapi.Parameter('page', openapi.IN_QUERY, type=openapi.TYPE_INTEGER, default=DEFAULT_PAGE_NUMBER),
        ],
        responses={
            200: openapi.Response('OK'),
            503: openapi.Response('TMDB unavailable'),
        },
    )
    @action(detail=False, methods=['get'])
    def tmdb(self, request, *args, **kwargs):
        query = request.GET.get('query', '').strip()
        page = request.GET.get('page', DEFAULT_PAGE_NUMBER)

        if not query:
            return Response({'results': [], 'total_results': 0}, status=status.HTTP_200_OK)

        try:
            results = get_people_search_results(query=query, page=page)
        except HTTPError:
            results = {'results': [], 'total_results': 0}

        normalized_results = []
        for result in results.get('results', []):
            tmdb_id = result.get('id')
            name = (result.get('name') or '').strip()
            if not tmdb_id or not name:
                continue

            person, created = Person.objects.get_or_create(
                tmdb_id=tmdb_id,
                defaults={
                    'name': name,
                    'tmdb_popularity': result.get('popularity'),
                    'tmdb_profile_path': (
                        TMDB_POSTER_PATH_PREFIX + result.get('profile_path')
                        if result.get('profile_path')
                        else ''
                    ),
                },
            )
            if not created:
                update_fields = []
                if person.name != name:
                    person.name = name
                    update_fields.append('name')
                if result.get('popularity') is not None and person.tmdb_popularity != result.get('popularity'):
                    person.tmdb_popularity = result.get('popularity')
                    update_fields.append('tmdb_popularity')

                profile_path = TMDB_POSTER_PATH_PREFIX + result.get('profile_path') if result.get('profile_path') else ''
                if profile_path and person.tmdb_profile_path != profile_path:
                    person.tmdb_profile_path = profile_path
                    update_fields.append('tmdb_profile_path')

                if update_fields:
                    person.save(update_fields=update_fields)

            normalized_results.append({
                'id': person.id,
                'tmdb_id': person.tmdb_id,
                'name': person.name,
                'profile_path': get_proxy_url(request, person.tmdb_profile_path),
                'known_for_department': result.get('known_for_department') or '',
                'known_for_titles': extract_known_for_titles(result.get('known_for')),
            })

        return Response({
            'results': normalized_results,
            'total_results': results.get('total_results') or len(normalized_results),
        }, status=status.HTTP_200_OK)


def get_people_search_results(query, page):
    key = f'tmdb_people_search_{query.replace(" ", "_")}_page_{page}'
    results = cache.get(key, None)
    if results is None:
        results = tmdb.Search().person(query=query, page=page, language=LANGUAGE)
        cache.set(key, results, CACHE_TIMEOUT)
    return results


def extract_known_for_titles(items):
    if not isinstance(items, list):
        return []

    titles = []
    for item in items:
        if not isinstance(item, dict):
            continue
        title = (item.get('title') or item.get('name') or '').strip()
        if title and title not in titles:
            titles.append(title)
    return titles
