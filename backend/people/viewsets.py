from datetime import timedelta

from django.utils import timezone
from requests import ConnectionError, HTTPError, Timeout
from rest_framework import mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from movies.models import Movie, UserMovie
from people.functions import fetch_and_upsert_person, get_tmdb_person_movie_credits, get_tmdb_person_tv_credits
from people.models import Person
from people.tasks import refresh_person_details
from proxy.functions import get_proxy_url
from shows.models import Show, UserShow
from utils.constants import ERROR, PERSON_NOT_FOUND, TMDB_UNAVAILABLE, TMDB_POSTER_PREVIEW_PATH_PREFIX
from utils.swagger import openapi, swagger_auto_schema

PERSON_DETAILS_REFRESH_INTERVAL = timedelta(days=7)


class PersonViewSet(GenericViewSet, mixins.RetrieveModelMixin):
    queryset = Person.objects.all()
    lookup_value_regex = r'\d+'

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('pk', openapi.IN_PATH, type=openapi.TYPE_INTEGER),
        ],
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Person not found'),
            503: openapi.Response('TMDB unavailable'),
        }
    )
    def retrieve(self, request, *args, **kwargs):
        person_lookup = kwargs.get('pk')

        try:
            lookup_id = int(person_lookup)
        except (TypeError, ValueError):
            return Response({ERROR: PERSON_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        person = Person.objects.filter(id=lookup_id).first()
        if person is None:
            return Response({ERROR: PERSON_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        person, error_response = load_or_refresh_person(person=person, tmdb_id=person.tmdb_id)
        if error_response:
            return error_response

        response = Response(parse_person(person, request))

        if person.tmdb_last_update and person.tmdb_last_update <= timezone.now() - PERSON_DETAILS_REFRESH_INTERVAL:
            person_tmdb_id = person.tmdb_id
            response.add_post_render_callback(lambda _: enqueue_person_refresh(person_tmdb_id))

        return response

    @swagger_auto_schema(
        manual_parameters=[
            openapi.Parameter('tmdb_id', openapi.IN_PATH, type=openapi.TYPE_INTEGER),
        ],
        responses={
            200: openapi.Response('OK'),
            404: openapi.Response('Person not found'),
            503: openapi.Response('TMDB unavailable'),
        }
    )
    @action(detail=False, methods=['get'], url_path=r'tmdb/(?P<tmdb_id>\d+)')
    def tmdb(self, request, tmdb_id=None):
        try:
            person_tmdb_id = int(tmdb_id)
        except (TypeError, ValueError):
            return Response({ERROR: PERSON_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)

        person = Person.objects.filter(tmdb_id=person_tmdb_id).first()
        person, error_response = load_or_refresh_person(person=person, tmdb_id=person_tmdb_id)
        if error_response:
            return error_response

        response = Response(parse_person(person, request))

        if person.tmdb_last_update and person.tmdb_last_update <= timezone.now() - PERSON_DETAILS_REFRESH_INTERVAL:
            person_tmdb_id = person.tmdb_id
            response.add_post_render_callback(lambda _: enqueue_person_refresh(person_tmdb_id))

        return response


def parse_person(person, request):
    movies_credits = safe_get_credits(get_tmdb_person_movie_credits, person.tmdb_id)
    shows_credits = safe_get_credits(get_tmdb_person_tv_credits, person.tmdb_id)

    movies = parse_credits_items(
        request=request,
        cast_items=movies_credits.get('cast') or [],
        crew_items=[item for item in (movies_credits.get('crew') or []) if item.get('job') == 'Director'],
        name_key='title',
        original_name_key='original_title',
        release_date_key='release_date',
    )
    shows = parse_credits_items(
        request=request,
        cast_items=shows_credits.get('cast') or [],
        crew_items=[item for item in (shows_credits.get('crew') or []) if item.get('job') == 'Director'],
        name_key='name',
        original_name_key='original_name',
        release_date_key='first_air_date',
    )

    if request.user.is_authenticated:
        attach_movies_user_status(request, movies)
        attach_shows_user_status(request, shows)

    return {
        'id': person.id,
        'tmdb_id': person.tmdb_id,
        'imdb_id': person.imdb_id,
        'name': person.name,
        'popularity': person.tmdb_popularity,
        'also_known_as': person.tmdb_also_known_as or [],
        'birthday': format_date(person.tmdb_birthday),
        'deathday': format_date(person.tmdb_deathday),
        'biography': person.tmdb_biography,
        'place_of_birth': person.tmdb_place_of_birth,
        'profile_path': get_proxy_url(request, person.tmdb_profile_path),
        'movies': movies,
        'shows': shows,
    }


def safe_get_credits(fetch_fn, tmdb_id):
    try:
        return fetch_fn(tmdb_id)
    except Exception:
        return {'cast': [], 'crew': []}


def parse_credits_items(request, cast_items, crew_items, name_key, original_name_key, release_date_key):
    by_item = {}

    for item in cast_items:
        tmdb_id = item.get('id')
        if not tmdb_id:
            continue
        by_item[tmdb_id] = {
            'id': tmdb_id,
            'name': item.get(name_key) or 'Без названия',
            'original_name': item.get(original_name_key) or '',
            'poster_path': get_proxy_url(request, TMDB_POSTER_PREVIEW_PATH_PREFIX, item.get('poster_path')),
            '_release_date_raw': item.get(release_date_key) or '',
            'release_date': format_date(item.get(release_date_key)),
            'score': int(item['vote_average'] * 10) if item.get('vote_average') else None,
            'roles': ['actor'],
            'character': item.get('character') or '',
            'user_status': None,
            'user_score': None,
        }

    for item in crew_items:
        tmdb_id = item.get('id')
        if not tmdb_id:
            continue
        existing = by_item.get(tmdb_id)
        if existing:
            if 'director' not in existing['roles']:
                existing['roles'].append('director')
            continue
        by_item[tmdb_id] = {
            'id': tmdb_id,
            'name': item.get(name_key) or 'Без названия',
            'original_name': item.get(original_name_key) or '',
            'poster_path': get_proxy_url(request, TMDB_POSTER_PREVIEW_PATH_PREFIX, item.get('poster_path')),
            '_release_date_raw': item.get(release_date_key) or '',
            'release_date': format_date(item.get(release_date_key)),
            'score': int(item['vote_average'] * 10) if item.get('vote_average') else None,
            'roles': ['director'],
            'character': '',
            'user_status': None,
            'user_score': None,
        }

    items = list(by_item.values())
    items.sort(
        key=lambda x: (
            x.get('_release_date_raw') == '',
            x.get('_release_date_raw') or '',
            x.get('name') or '',
        ),
        reverse=True,
    )
    for item in items:
        item.pop('_release_date_raw', None)
    return items


def attach_movies_user_status(request, movies):
    if not movies:
        return

    tmdb_ids = [item['id'] for item in movies]
    status_map = {
        UserMovie.STATUS_NOT_WATCHED: 'Не смотрел',
        UserMovie.STATUS_GOING: 'Буду смотреть',
        UserMovie.STATUS_STOPPED: 'Дропнул',
        UserMovie.STATUS_WATCHED: 'Посмотрел',
    }
    movie_rows = Movie.objects.filter(tmdb_id__in=tmdb_ids).values('id', 'tmdb_id')
    movie_pk_by_tmdb = {row['tmdb_id']: row['id'] for row in movie_rows}
    user_movies = UserMovie.objects.filter(
        user=request.user,
        movie_id__in=list(movie_pk_by_tmdb.values()),
    ).values('movie__tmdb_id', 'status', 'score')
    user_status_by_tmdb = {row['movie__tmdb_id']: status_map.get(row['status']) for row in user_movies}
    user_score_by_tmdb = {row['movie__tmdb_id']: row.get('score') for row in user_movies}
    for movie in movies:
        movie['user_status'] = user_status_by_tmdb.get(movie['id'])
        movie['user_score'] = user_score_by_tmdb.get(movie['id'])


def attach_shows_user_status(request, shows):
    if not shows:
        return

    tmdb_ids = [item['id'] for item in shows]
    status_map = {
        UserShow.STATUS_NOT_WATCHED: 'Не смотрел',
        UserShow.STATUS_GOING: 'Буду смотреть',
        UserShow.STATUS_STOPPED: 'Дропнул',
        UserShow.STATUS_WATCHED: 'Посмотрел',
        UserShow.STATUS_WATCHING: 'Смотрю',
    }
    show_rows = Show.objects.filter(tmdb_id__in=tmdb_ids).values('id', 'tmdb_id')
    show_pk_by_tmdb = {row['tmdb_id']: row['id'] for row in show_rows}
    user_shows = UserShow.objects.filter(
        user=request.user,
        show_id__in=list(show_pk_by_tmdb.values()),
    ).values('show__tmdb_id', 'status', 'score')
    user_status_by_tmdb = {row['show__tmdb_id']: status_map.get(row['status']) for row in user_shows}
    user_score_by_tmdb = {row['show__tmdb_id']: row.get('score') for row in user_shows}
    for show in shows:
        show['user_status'] = user_status_by_tmdb.get(show['id'])
        show['user_score'] = user_score_by_tmdb.get(show['id'])


def load_or_refresh_person(person, tmdb_id):
    should_fetch_from_tmdb = person is None or person.tmdb_last_update is None
    if not should_fetch_from_tmdb:
        return person, None

    try:
        person = fetch_and_upsert_person(tmdb_id)
    except HTTPError as e:
        error_code = int(e.args[0].split(' ', 1)[0])
        if error_code == 404:
            return None, Response({ERROR: PERSON_NOT_FOUND}, status=status.HTTP_404_NOT_FOUND)
        return None, Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except (ConnectionError, Timeout, ValueError):
        return None, Response({ERROR: TMDB_UNAVAILABLE}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return person, None


def enqueue_person_refresh(tmdb_id):
    try:
        refresh_person_details.delay(tmdb_id)
    except Exception:
        pass


def format_date(value):
    if value is None:
        return None
    if isinstance(value, str):
        parts = value.split('-')
        if len(parts) == 3:
            return '.'.join(reversed(parts))
        return value
    return value.strftime('%d.%m.%Y')
