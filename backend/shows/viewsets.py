import tmdbsimple as tmdb
from django.core.cache import cache

from movies.models import Genre
from proxy.functions import get_proxy_url
from shows.functions import get_tmdb_show_key
from shows.models import UserShow, Show, ShowGenre
from shows.serializers import ShowSerializer
from utils.constants import LANGUAGE, CACHE_TIMEOUT, TMDB_BACKDROP_PATH_PREFIX, \
    TMDB_POSTER_PATH_PREFIX, YOUTUBE_PREFIX
from utils.functions import objects_to_str


def update_show_genres(show: Show, tmdb_show: dict) -> None:
    existing_show_genres = ShowGenre.objects.filter(show=show)
    new_show_genres = []
    show_genres_to_delete_ids = []

    for genre in tmdb_show.get('genres'):
        genre_obj, created = Genre.objects.get_or_create(tmdb_id=genre.get('id'),
                                                         defaults={
                                                             'tmdb_name': genre.get('name')
                                                         })
        show_genre_obj, created = ShowGenre.objects.get_or_create(genre=genre_obj, show=show)
        new_show_genres.append(show_genre_obj)

    for existing_show_genre in existing_show_genres:
        if existing_show_genre not in new_show_genres:
            show_genres_to_delete_ids.append(existing_show_genre.id)

    ShowGenre.objects.filter(id__in=show_genres_to_delete_ids).delete()


def user_watched_show(show, user):
    if show is None:
        return False

    user_show = UserShow.objects.filter(user=user, show=show).first()
    if user_show is not None and user_show.status != UserShow.STATUS_NOT_WATCHED:
        return True

    return False


def get_show_info(show_id, request):
    show = Show.objects.get(tmdb_id=show_id)
    show_data = ShowSerializer(show, context={'request': request}).data
    return {'show': show_data}


def get_tmdb_show(tmdb_id):
    returned_from_cache = True
    key = get_tmdb_show_key(tmdb_id)
    tmdb_show = cache.get(key, None)
    if tmdb_show is None:
        tmdb_show = tmdb.TV(tmdb_id).info(language=LANGUAGE)
        cache.set(key, tmdb_show, CACHE_TIMEOUT)
        returned_from_cache = False
    return tmdb_show, returned_from_cache


def get_tmdb_show_videos(tmdb_id):
    key = f'show_{tmdb_id}_videos'
    tmdb_show_videos = cache.get(key, None)
    if tmdb_show_videos is None:
        tmdb_show_videos = tmdb.TV(tmdb_id).videos(language=LANGUAGE)['results']
        tmdb_show_videos = [x for x in tmdb_show_videos if x['site'] == 'YouTube']
        for index, video in enumerate(tmdb_show_videos):
            tmdb_show_videos[index] = {
                'name': video['name'],
                'url': YOUTUBE_PREFIX + video['key']
            }
        cache.set(key, tmdb_show_videos, CACHE_TIMEOUT)
    return tmdb_show_videos


def parse_show(tmdb_show, schema):
    new_show = {
        'id': tmdb_show.get('id'),
        'name': tmdb_show.get('name'),
        'original_name': tmdb_show.get('original_name'),
        'overview': tmdb_show.get('overview'),
        'episode_run_time': tmdb_show['episode_run_time'][0] if len(tmdb_show['episode_run_time']) > 0 else 0,
        'seasons_count': tmdb_show.get('number_of_seasons'),
        'episodes_count': tmdb_show.get('number_of_episodes'),
        'score': int(tmdb_show['vote_average'] * 10) if tmdb_show.get('vote_average') is not None else None,
        'backdrop_path': get_proxy_url(schema, TMDB_BACKDROP_PATH_PREFIX, tmdb_show.get('backdrop_path')),
        'poster_path': get_proxy_url(schema, TMDB_POSTER_PATH_PREFIX, tmdb_show.get('poster_path')),
        'genres': objects_to_str(tmdb_show['genres']),
        'production_companies': objects_to_str(tmdb_show['production_companies']),
        'status': translate_tmdb_status(tmdb_show['status']),
        'first_air_date': '.'.join(reversed(tmdb_show['first_air_date'].split('-')))
        if tmdb_show.get('first_air_date') is not None else None,
        'last_air_date': '.'.join(reversed(tmdb_show['last_air_date'].split('-')))
        if tmdb_show.get('last_air_date') is not None else None,
        'videos': tmdb_show.get('videos'),
        'seasons': tmdb_show['seasons'],
    }

    return new_show


def translate_tmdb_status(tmdb_status):
    for choice in Show.TMDB_STATUS_CHOICES:
        if tmdb_status in choice:
            return choice[1]
    return tmdb_status
