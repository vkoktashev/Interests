from datetime import datetime

from django.contrib.postgres.search import TrigramSimilarity
from django.core.paginator import Paginator
from django.db.models import Avg, Count, IntegerField, Max, Q, Value
from django.db.models.functions import Coalesce, Greatest

from proxy.functions import get_proxy_url
from shows.models import Episode, EpisodeLog, Show, ShowLog, ShowPerson, UserEpisode, UserShow
from shows.serializers import (
    EpisodeSerializer,
    FollowedUserShowSerializer,
    SeasonSerializer,
    ShowSerializer,
    UserShowReadSerializer,
)
from users.functions import get_public_non_followed_user_ids
from users.models import UserFollow
from utils.constants import (
    EPISODE_NOT_WATCHED_SCORE,
    TMDB_BACKDROP_PATH_PREFIX,
    TMDB_POSTER_PATH_PREFIX,
)
from utils.functions import resolve_display_name
from utils.rating import get_imdb_weighted_score_annotation


def get_show_payload(show, request):
    genres = [
        show_genre.genre.tmdb_name
        for show_genre in show.showgenre_set.select_related('genre').all()
    ]
    cast_people = _get_show_people(show, ShowPerson.ROLE_ACTOR, request)
    directors_people = _get_show_people(show, ShowPerson.ROLE_DIRECTOR, request)
    creators_people = _get_show_people(show, ShowPerson.ROLE_CREATOR, request)
    seasons = [{
        'id': season.tmdb_id,
        'name': season.tmdb_name,
        'overview': season.tmdb_overview,
        'poster_path': get_proxy_url(request, season.tmdb_poster_path),
        'air_date': _format_date(season.tmdb_air_date),
        'season_number': season.tmdb_season_number,
    } for season in show.season_set.filter(
        tmdb_season_number__in=show.tmdb_season_numbers,
    ).order_by('tmdb_season_number').distinct()]

    return {
        'id': show.tmdb_id,
        'object_id': show.pk,
        'imdb_id': show.imdb_id,
        'name': resolve_display_name(
            show.tmdb_name,
            show.tmdb_original_name,
            show.tmdb_name_en,
            show.tmdb_original_language,
        ),
        'original_name': show.tmdb_original_name,
        'overview': show.tmdb_overview or show.tmdb_overview_en,
        'episode_run_time': show.tmdb_episode_runtime,
        'seasons_count': show.tmdb_number_of_seasons,
        'episodes_count': show.tmdb_number_of_episodes,
        'score': show.tmdb_score,
        'backdrop_path': get_proxy_url(request, show.tmdb_backdrop_path),
        'poster_path': get_proxy_url(request, show.tmdb_poster_path),
        'genres': ', '.join(genres),
        'production_companies': show.tmdb_production_companies,
        'status': _translate_tmdb_status(show.tmdb_status),
        'first_air_date': _format_date(show.tmdb_release_date),
        'last_air_date': _format_date(show.tmdb_last_air_date),
        'seasons': seasons,
        'cast': ', '.join(item['name'] for item in cast_people),
        'directors': ', '.join(item['name'] for item in directors_people),
        'creators': ', '.join(item['name'] for item in creators_people),
        'cast_people': cast_people,
        'directors_people': directors_people,
        'creators_people': creators_people,
    }


def get_show_social_payload(tmdb_id, user, request):
    try:
        show = Show.objects.get(tmdb_id=tmdb_id)
    except (Show.DoesNotExist, TypeError, ValueError):
        return {'user_info': None, 'friends_info': (), 'users_info': ()}

    user_show = UserShow.objects.exclude(status=UserShow.STATUS_NOT_WATCHED) \
        .filter(user=user, show=show).first()
    user_info = UserShowReadSerializer(user_show, context={'request': request}).data \
        if user_show is not None else None

    followed_user_ids = UserFollow.objects.filter(
        user=user,
        is_following=True,
    ).values('followed_user')
    followed_user_shows = UserShow.objects.select_related('user') \
        .exclude(status=UserShow.STATUS_NOT_WATCHED) \
        .filter(user__in=followed_user_ids, show=show)
    friends_info = FollowedUserShowSerializer(
        followed_user_shows,
        many=True,
    ).data

    public_user_shows = UserShow.objects.select_related('user') \
        .exclude(status=UserShow.STATUS_NOT_WATCHED) \
        .filter(user__in=get_public_non_followed_user_ids(user), show=show) \
        .order_by('-updated_at')[:20]
    users_info = FollowedUserShowSerializer(
        public_user_shows,
        many=True,
    ).data
    return {
        'user_info': user_info,
        'friends_info': friends_info,
        'users_info': users_info,
    }


def get_recommendations_payload(payload, page, request):
    recommendations = [{
        'id': item.get('id'),
        'name': item.get('name') or '',
        'original_name': item.get('original_name') or '',
        'overview': item.get('overview') or '',
        'release_date': item.get('first_air_date') or '',
        'vote_average': item.get('vote_average'),
        'vote_count': item.get('vote_count') or 0,
        'poster_path': get_proxy_url(request, TMDB_POSTER_PATH_PREFIX, item.get('poster_path')),
        'backdrop_path': get_proxy_url(request, TMDB_BACKDROP_PATH_PREFIX, item.get('backdrop_path')),
    } for item in (payload.get('results') or [])]
    return {
        'page': payload.get('page') or page,
        'total_pages': payload.get('total_pages') or 1,
        'total_results': payload.get('total_results') or len(recommendations),
        'results': recommendations,
    }


def get_database_show_search_results(user, query, page, page_size):
    if not query:
        return []

    shows = Show.objects.annotate(
        similarity=Greatest(
            TrigramSimilarity('tmdb_name', query),
            TrigramSimilarity('tmdb_original_name', query),
        )
    ).filter(
        Q(tmdb_name__icontains=query)
        | Q(tmdb_original_name__icontains=query)
        | Q(similarity__gt=0.1)
    ).order_by('-similarity', 'tmdb_name')
    paginator_page = Paginator(shows, page_size).get_page(page)
    results = ShowSerializer(paginator_page.object_list, many=True).data
    attach_shows_user_status(user, results)
    return results


def get_tmdb_show_search_payload(payload, user, request):
    results = []
    for source_item in payload.get('results', []):
        item = dict(source_item)
        item['backdrop_path'] = get_proxy_url(
            request,
            TMDB_BACKDROP_PATH_PREFIX,
            item.get('backdrop_path'),
        )
        item['poster_path'] = get_proxy_url(
            request,
            TMDB_POSTER_PATH_PREFIX,
            item.get('poster_path'),
        )
        results.append(item)
    attach_shows_user_status(user, results)

    response = dict(payload)
    response['results'] = results
    return response


def get_top_rated_shows_payload(user, request, limit_value, page_value, page_size_value):
    page = _bounded_int(page_value, default=1, minimum=1)
    page_size = _bounded_int(page_size_value, default=50, minimum=1, maximum=50)
    base_qs = UserShow.objects.filter(score__gt=0) \
        .exclude(status=UserShow.STATUS_NOT_WATCHED)
    global_average_score = base_qs.aggregate(value=Avg('score')).get('value') or 0
    rows_qs = base_qs.values(
        'show__tmdb_id',
        'show__tmdb_name',
        'show__tmdb_poster_path',
        'show__tmdb_backdrop_path',
        'show__tmdb_release_date',
        'show__tmdb_overview',
        'show__tmdb_score',
    ).annotate(
        ratings_count=Count('id'),
        average_user_score=Avg('score'),
        platform_score=Coalesce(
            'show__tmdb_score',
            Value(-1),
            output_field=IntegerField(),
        ),
    ).annotate(
        weighted_score=get_imdb_weighted_score_annotation(global_average_score),
    ).order_by(
        '-weighted_score',
        '-platform_score',
        '-ratings_count',
        '-average_user_score',
        'show__tmdb_name',
    )

    if limit_value is not None:
        limit = _bounded_int(limit_value, default=10, minimum=1, maximum=20)
        rows = list(rows_qs[:limit])
        total_count = len(rows)
    else:
        paginator = Paginator(rows_qs, page_size)
        paginator_page = paginator.get_page(page)
        rows = list(paginator_page.object_list)
        total_count = paginator.count

    show_ids = [
        row['show__tmdb_id']
        for row in rows
        if row.get('show__tmdb_id') is not None
    ]
    status_by_show_id = _get_show_status_by_tmdb_id(user, show_ids)
    results = [{
        'id': row.get('show__tmdb_id'),
        'name': row.get('show__tmdb_name'),
        'poster_path': get_proxy_url(request, row.get('show__tmdb_poster_path') or ''),
        'backdrop_path': get_proxy_url(request, row.get('show__tmdb_backdrop_path') or ''),
        'release_date': row.get('show__tmdb_release_date'),
        'overview': row.get('show__tmdb_overview') or '',
        'user_status': status_by_show_id.get(row.get('show__tmdb_id')),
        'ratings_count': int(row.get('ratings_count') or 0),
        'average_user_score': round(float(row.get('average_user_score') or 0), 1),
        'weighted_score': round(float(row.get('weighted_score') or 0), 2),
        'platform_score': row.get('show__tmdb_score'),
    } for row in rows]
    return {
        'results': results,
        'count': total_count,
        'page': page if limit_value is None else 1,
        'page_size': page_size if limit_value is None else len(results),
        'sort': 'imdb',
    }


def get_trending_shows_payload(payload, time_window, request):
    results = [{
        'id': item.get('id'),
        'name': item.get('name') or item.get('title') or '',
        'original_name': item.get('original_name') or item.get('original_title') or '',
        'poster_path': get_proxy_url(request, TMDB_POSTER_PATH_PREFIX, item.get('poster_path')),
        'backdrop_path': get_proxy_url(request, TMDB_BACKDROP_PATH_PREFIX, item.get('backdrop_path')),
        'release_date': item.get('first_air_date'),
        'vote_average': item.get('vote_average'),
        'vote_count': item.get('vote_count'),
        'overview': item.get('overview') or '',
    } for item in payload.get('results', [])[:10]]
    return {'time_window': time_window, 'results': results}


def attach_shows_user_status(user, results):
    for result in results:
        result['user_status'] = None
    if not results or not user.is_authenticated:
        return

    tmdb_ids = [result.get('id', result.get('tmdb_id')) for result in results]
    status_by_tmdb_id = _get_show_status_by_tmdb_id(user, tmdb_ids)
    for result in results:
        tmdb_id = result.get('id', result.get('tmdb_id'))
        result['user_status'] = status_by_tmdb_id.get(tmdb_id)


def get_unwatched_episodes_payload(user, request):
    shows = Show.objects.filter(
        Q(usershow__user=user) &
        Q(usershow__status__in=(UserShow.STATUS_WATCHING, UserShow.STATUS_WATCHED))
    )
    available_episodes = Episode.objects.filter(
        tmdb_season__tmdb_show__in=shows,
        tmdb_release_date__lte=datetime.today().date(),
    ).exclude(tmdb_season__tmdb_season_number=0)

    progress_by_show_id = {
        row['tmdb_season__tmdb_show_id']: row
        for row in available_episodes
        .values('tmdb_season__tmdb_show_id')
        .annotate(
            total_episodes_count=Count('id', distinct=True),
            watched_episodes_count=Count(
                'id',
                filter=Q(userepisode__user=user, userepisode__score__gt=-1),
                distinct=True,
            ),
        )
    }
    episodes = available_episodes.select_related(
        'tmdb_season',
        'tmdb_season__tmdb_show',
    ).exclude(
        userepisode__in=UserEpisode.objects.filter(score__gt=-1, user=user)
    ).order_by('tmdb_season__tmdb_season_number', 'tmdb_episode_number')

    shows_info = []
    shows_info_by_id = {}
    seasons_info_by_id = {}
    for episode in episodes:
        season = episode.tmdb_season
        show = season.tmdb_show
        show_info = shows_info_by_id.get(show.id)
        if show_info is None:
            show_info = dict(ShowSerializer(show, context={'request': request}).data)
            progress = progress_by_show_id.get(show.id, {})
            show_info.update({
                'seasons': [],
                'total_episodes_count': progress.get('total_episodes_count', 0),
                'watched_episodes_count': progress.get('watched_episodes_count', 0),
            })
            shows_info_by_id[show.id] = show_info
            shows_info.append(show_info)

        season_info = seasons_info_by_id.get(season.id)
        if season_info is None:
            season_info = dict(SeasonSerializer(season).data)
            season_info['episodes'] = []
            seasons_info_by_id[season.id] = season_info
            show_info['seasons'].append(season_info)
        season_info['episodes'].append(EpisodeSerializer(episode).data)

    last_watched_at_by_show_tmdb_id = _get_last_watched_at_by_show(user, shows_info)
    shows_info.sort(
        key=lambda item: last_watched_at_by_show_tmdb_id[item['tmdb_id']].timestamp()
        if item['tmdb_id'] in last_watched_at_by_show_tmdb_id else 0,
        reverse=True,
    )
    return shows_info


def user_watched_show(show, user):
    if show is None:
        return False
    return UserShow.objects.filter(user=user, show=show) \
        .exclude(status=UserShow.STATUS_NOT_WATCHED).exists()


def _get_show_people(show, role, request):
    result = []
    for show_person in show.showperson_set.select_related('person') \
            .filter(role=role).order_by('sort_order'):
        person_data = {
            'id': show_person.person.id,
            'tmdb_id': show_person.person.tmdb_id,
            'name': show_person.person.name,
            'profile_path': get_proxy_url(request, show_person.person.tmdb_profile_path),
        }
        if role == ShowPerson.ROLE_ACTOR:
            person_data.update({
                'character': show_person.character,
                'episode_count': show_person.episode_count,
            })
        result.append(person_data)
    return result


def _get_last_watched_at_by_show(user, shows_info):
    show_tmdb_ids = [show_info['tmdb_id'] for show_info in shows_info]
    result = {
        row['episode__tmdb_season__tmdb_show__tmdb_id']: row['last_watched_at']
        for row in EpisodeLog.objects
        .filter(
            user=user,
            action_type=EpisodeLog.ACTION_TYPE_SCORE,
            episode__tmdb_season__tmdb_show__tmdb_id__in=show_tmdb_ids,
        )
        .exclude(action_result=str(EPISODE_NOT_WATCHED_SCORE))
        .values('episode__tmdb_season__tmdb_show__tmdb_id')
        .annotate(last_watched_at=Max('created'))
    }
    bulk_rows = ShowLog.objects.filter(
        user=user,
        action_type=ShowLog.ACTION_TYPE_EPISODES,
        show__tmdb_id__in=show_tmdb_ids,
    ).exclude(action_result__startswith='-').values('show__tmdb_id').annotate(
        last_watched_at=Max('created')
    )
    for row in bulk_rows:
        current = result.get(row['show__tmdb_id'])
        if current is None or row['last_watched_at'] > current:
            result[row['show__tmdb_id']] = row['last_watched_at']
    return result


def _translate_tmdb_status(tmdb_status):
    for value, label in Show.TMDB_STATUS_CHOICES:
        if tmdb_status in (value, label):
            return label
    return tmdb_status


def _format_date(value):
    if value is None:
        return None
    if isinstance(value, str):
        parts = value.split('-')
        return '.'.join(reversed(parts)) if len(parts) == 3 else value
    return value.strftime('%d.%m.%Y')


def _get_show_status_by_tmdb_id(user, tmdb_ids):
    if not tmdb_ids or not user or not user.is_authenticated:
        return {}
    return {
        row['show__tmdb_id']: row['status']
        for row in UserShow.objects.filter(
            user=user,
            show__tmdb_id__in=tmdb_ids,
        ).values('show__tmdb_id', 'status')
    }


def _bounded_int(value, default, minimum, maximum=None):
    try:
        result = int(value)
    except (TypeError, ValueError):
        result = default
    result = max(result, minimum)
    return min(result, maximum) if maximum is not None else result
