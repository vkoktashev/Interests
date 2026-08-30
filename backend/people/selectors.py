from movies.models import Movie, UserMovie
from people.functions import get_tmdb_person_movie_credits, get_tmdb_person_tv_credits
from people.models import UserPerson
from proxy.functions import get_proxy_url
from shows.models import Show, UserShow
from utils.constants import TMDB_POSTER_PREVIEW_PATH_PREFIX


MOVIE_CREW_ROLES_BY_JOB = {
    'Director': 'director',
}
SHOW_CREW_ROLES_BY_JOB = {
    'Director': 'director',
    'Creator': 'creator',
}


def get_person_payload(person, request):
    movies_credits = _safe_get_credits(get_tmdb_person_movie_credits, person.tmdb_id)
    shows_credits = _safe_get_credits(get_tmdb_person_tv_credits, person.tmdb_id)

    movies = _get_credits_items(
        request=request,
        cast_items=movies_credits.get('cast') or [],
        crew_items=movies_credits.get('crew') or [],
        crew_roles_by_job=MOVIE_CREW_ROLES_BY_JOB,
        name_key='title',
        original_name_key='original_title',
        release_date_key='release_date',
    )
    shows = _get_credits_items(
        request=request,
        cast_items=shows_credits.get('cast') or [],
        crew_items=shows_credits.get('crew') or [],
        crew_roles_by_job=SHOW_CREW_ROLES_BY_JOB,
        name_key='name',
        original_name_key='original_name',
        release_date_key='first_air_date',
    )

    if request.user.is_authenticated:
        _attach_movies_user_status(request.user, movies)
        _attach_shows_user_status(request.user, shows)

    return {
        'id': person.id,
        'tmdb_id': person.tmdb_id,
        'imdb_id': person.imdb_id,
        'name': person.name,
        'popularity': person.tmdb_popularity,
        'also_known_as': person.tmdb_also_known_as or [],
        'birthday': _format_date(person.tmdb_birthday),
        'deathday': _format_date(person.tmdb_deathday),
        'biography': person.tmdb_biography,
        'place_of_birth': person.tmdb_place_of_birth,
        'profile_path': get_proxy_url(request, person.tmdb_profile_path),
        'is_tracked': request.user.is_authenticated and UserPerson.objects.filter(
            user=request.user,
            person=person,
        ).exists(),
        'movies': movies,
        'shows': shows,
    }


def get_people_search_payload(people, total_results, request):
    results = []
    for item in people:
        person = item['person']
        results.append({
            'id': person.id,
            'tmdb_id': person.tmdb_id,
            'name': person.name,
            'profile_path': get_proxy_url(request, person.tmdb_profile_path),
            'known_for_department': item['known_for_department'],
            'known_for_titles': _extract_known_for_titles(item['known_for']),
        })
    return {
        'results': results,
        'total_results': total_results,
    }


def _safe_get_credits(fetch_fn, tmdb_id):
    try:
        return fetch_fn(tmdb_id)
    except Exception:
        return {'cast': [], 'crew': []}


def _get_credits_items(
        request,
        cast_items,
        crew_items,
        crew_roles_by_job,
        name_key,
        original_name_key,
        release_date_key
):
    by_item = {}

    for item in cast_items:
        tmdb_id = item.get('id')
        if not tmdb_id:
            continue
        by_item[tmdb_id] = _get_credit_item(
            request,
            item,
            name_key,
            original_name_key,
            release_date_key,
            roles=['actor'],
            character=item.get('character') or '',
        )

    for item in crew_items:
        role = crew_roles_by_job.get(item.get('job'))
        tmdb_id = item.get('id')
        if role is None or not tmdb_id:
            continue

        existing = by_item.get(tmdb_id)
        if existing:
            if role not in existing['roles']:
                existing['roles'].append(role)
            continue
        by_item[tmdb_id] = _get_credit_item(
            request,
            item,
            name_key,
            original_name_key,
            release_date_key,
            roles=[role],
            character='',
        )

    items = list(by_item.values())
    items.sort(
        key=lambda item: (
            item.get('_release_date_raw') == '',
            item.get('_release_date_raw') or '',
            item.get('name') or '',
        ),
        reverse=True,
    )
    for item in items:
        item.pop('_release_date_raw', None)
    return items


def _get_credit_item(
        request,
        item,
        name_key,
        original_name_key,
        release_date_key,
        roles,
        character
):
    return {
        'id': item.get('id'),
        'name': item.get(name_key) or 'Без названия',
        'original_name': item.get(original_name_key) or '',
        'poster_path': get_proxy_url(
            request,
            TMDB_POSTER_PREVIEW_PATH_PREFIX,
            item.get('poster_path'),
        ),
        '_release_date_raw': item.get(release_date_key) or '',
        'release_date': _format_date(item.get(release_date_key)),
        'score': int(item['vote_average'] * 10) if item.get('vote_average') else None,
        'roles': roles,
        'character': character,
        'user_status': None,
        'user_score': None,
    }


def _attach_movies_user_status(user, movies):
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
        user=user,
        movie_id__in=list(movie_pk_by_tmdb.values()),
    ).values('movie__tmdb_id', 'status', 'score')
    user_status_by_tmdb = {row['movie__tmdb_id']: status_map.get(row['status']) for row in user_movies}
    user_score_by_tmdb = {row['movie__tmdb_id']: row.get('score') for row in user_movies}
    for movie in movies:
        movie['user_status'] = user_status_by_tmdb.get(movie['id'])
        movie['user_score'] = user_score_by_tmdb.get(movie['id'])


def _attach_shows_user_status(user, shows):
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
        user=user,
        show_id__in=list(show_pk_by_tmdb.values()),
    ).values('show__tmdb_id', 'status', 'score')
    user_status_by_tmdb = {row['show__tmdb_id']: status_map.get(row['status']) for row in user_shows}
    user_score_by_tmdb = {row['show__tmdb_id']: row.get('score') for row in user_shows}
    for show in shows:
        show['user_status'] = user_status_by_tmdb.get(show['id'])
        show['user_score'] = user_score_by_tmdb.get(show['id'])


def _format_date(value):
    if value is None:
        return None
    if isinstance(value, str):
        parts = value.split('-')
        return '.'.join(reversed(parts)) if len(parts) == 3 else value
    return value.strftime('%d.%m.%Y')


def _extract_known_for_titles(items):
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
