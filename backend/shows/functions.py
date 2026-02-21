import tmdbsimple as tmdb
from django.core.cache import cache
from django.utils import timezone

from people.models import Person
from shows.models import Episode, ShowGenre, ShowPerson, SeasonPerson, EpisodePerson
from utils.constants import TMDB_BACKDROP_PATH_PREFIX, TMDB_POSTER_PATH_PREFIX, TMDB_STILL_PATH_PREFIX, LANGUAGE, \
    CACHE_TIMEOUT, YOUTUBE_PREFIX
from utils.functions import update_fields_if_needed


def get_show_new_fields(tmdb_show, tmdb_show_videos=None):
    parsed_videos = []
    if tmdb_show_videos is not None:
        youtube_videos = [video for video in tmdb_show_videos if video.get('site') == 'YouTube']
        parsed_videos = [{
            'name': video.get('name'),
            'url': YOUTUBE_PREFIX + video.get('key', '')
        } for video in youtube_videos if video.get('key')]

    return {
        'imdb_id': tmdb_show.get('imdb_id') if tmdb_show.get('imdb_id') is not None else '',
        'tmdb_original_name': tmdb_show.get('original_name') or '',
        'tmdb_name': tmdb_show.get('name') or '',
        'tmdb_episode_runtime': tmdb_show.get('episode_run_time', [0])[0] if len(tmdb_show.get('episode_run_time', [])) > 0 else 0,
        'tmdb_backdrop_path': TMDB_BACKDROP_PATH_PREFIX + tmdb_show['backdrop_path']
        if tmdb_show.get('backdrop_path') else '',
        'tmdb_poster_path': TMDB_POSTER_PATH_PREFIX + tmdb_show['poster_path']
        if tmdb_show.get('poster_path') else '',
        'tmdb_release_date': tmdb_show.get('first_air_date') if tmdb_show.get('first_air_date') not in (None, '') else None,
        'tmdb_last_air_date': tmdb_show.get('last_air_date') if tmdb_show.get('last_air_date') not in (None, '') else None,
        'tmdb_status': tmdb_show.get('status') or '',
        'tmdb_number_of_episodes': tmdb_show.get('number_of_episodes') or 0,
        'tmdb_number_of_seasons': tmdb_show.get('number_of_seasons') or 0,
        'tmdb_overview': tmdb_show.get('overview') or '',
        'tmdb_score': int(tmdb_show['vote_average'] * 10) if tmdb_show.get('vote_average') is not None else None,
        'tmdb_production_companies': ', '.join(
            company.get('name', '') for company in (tmdb_show.get('production_companies') or []) if company.get('name')
        ),
        'tmdb_videos': parsed_videos,
        'tmdb_last_update': timezone.now()
    }


def get_season_new_fields(tmdb_season, show_id):
    return {
        'tmdb_id': tmdb_season.get('id'),
        'tmdb_season_number': tmdb_season.get('season_number'),
        'tmdb_name': tmdb_season.get('name') or '',
        'tmdb_show_id': show_id,
        'tmdb_overview': tmdb_season.get('overview') or '',
        'tmdb_poster_path': TMDB_POSTER_PATH_PREFIX + tmdb_season['poster_path']
        if tmdb_season.get('poster_path') else '',
        'tmdb_air_date': tmdb_season.get('air_date') if tmdb_season.get('air_date') not in (None, '') else None,
        'tmdb_last_update': timezone.now()
    }


def get_episode_new_fields(tmdb_episode, season_id):
    return {
        'tmdb_id': tmdb_episode.get('id'),
        'tmdb_episode_number': tmdb_episode.get('episode_number'),
        'tmdb_season_id': season_id,
        'tmdb_name': tmdb_episode.get('name') or '',
        'tmdb_release_date': tmdb_episode.get('air_date') if tmdb_episode.get('air_date') not in (None, '') else None,
        'tmdb_runtime': tmdb_episode.get('runtime') if tmdb_episode.get('runtime') is not None else 0,
        'tmdb_overview': tmdb_episode.get('overview') or '',
        'tmdb_score': int(tmdb_episode['vote_average'] * 10) if tmdb_episode.get('vote_average') is not None else None,
        'tmdb_still_path': TMDB_STILL_PATH_PREFIX + tmdb_episode['still_path']
        if tmdb_episode.get('still_path') else '',
        'tmdb_last_update': timezone.now()
    }


def sync_show_genres(show, tmdb_show):
    existing_show_genres = ShowGenre.objects.filter(show=show)
    new_show_genres = []
    show_genres_to_delete_ids = []

    from movies.models import Genre
    for genre in tmdb_show.get('genres') or []:
        genre_obj, _ = Genre.objects.get_or_create(tmdb_id=genre.get('id'),
                                                   defaults={'tmdb_name': genre.get('name')})
        show_genre_obj, _ = ShowGenre.objects.get_or_create(genre=genre_obj, show=show)
        new_show_genres.append(show_genre_obj)

    for existing_show_genre in existing_show_genres:
        if existing_show_genre not in new_show_genres:
            show_genres_to_delete_ids.append(existing_show_genre.id)

    ShowGenre.objects.filter(id__in=show_genres_to_delete_ids).delete()


def sync_season_episodes(season, tmdb_episodes):
    existing_episodes = Episode.objects.filter(tmdb_season=season)
    existing_by_number = {episode.tmdb_episode_number: episode for episode in existing_episodes}
    new_ids = []

    for tmdb_episode in tmdb_episodes or []:
        episode_number = tmdb_episode.get('episode_number')
        if episode_number is None:
            continue

        fields = get_episode_new_fields(tmdb_episode, season.id)
        episode = existing_by_number.get(episode_number)
        if episode is None:
            episode = Episode.objects.create(**fields)
        else:
            update_fields_if_needed(episode, fields)
        new_ids.append(episode.id)

    Episode.objects.filter(tmdb_season=season).exclude(id__in=new_ids).delete()


def sync_people_links(parent_obj, tmdb_credits, relation_model, parent_field):
    cast = (tmdb_credits.get('cast') or [])[:5]
    crew = tmdb_credits.get('crew') or []
    directors = [person for person in crew if person.get('job') == 'Director']

    existing_links = relation_model.objects.filter(**{parent_field: parent_obj}).select_related('person')
    links_to_keep = []

    for index, person_data in enumerate(cast):
        person_id = person_data.get('id')
        person_name = person_data.get('name')
        if person_id is None or not person_name:
            continue

        person_obj, _ = Person.objects.get_or_create(tmdb_id=person_id, defaults={'name': person_name})
        if person_obj.name != person_name:
            person_obj.name = person_name
            person_obj.save(update_fields=('name',))

        relation_obj, _ = relation_model.objects.get_or_create(
            **{
                parent_field: parent_obj,
                'person': person_obj,
                'role': relation_model.ROLE_ACTOR
            },
            defaults={'sort_order': index}
        )
        if relation_obj.sort_order != index:
            relation_obj.sort_order = index
            relation_obj.save(update_fields=('sort_order',))
        links_to_keep.append(relation_obj.id)

    for index, person_data in enumerate(directors):
        person_id = person_data.get('id')
        person_name = person_data.get('name')
        if person_id is None or not person_name:
            continue

        person_obj, _ = Person.objects.get_or_create(tmdb_id=person_id, defaults={'name': person_name})
        if person_obj.name != person_name:
            person_obj.name = person_name
            person_obj.save(update_fields=('name',))

        relation_obj, _ = relation_model.objects.get_or_create(
            **{
                parent_field: parent_obj,
                'person': person_obj,
                'role': relation_model.ROLE_DIRECTOR
            },
            defaults={'sort_order': index}
        )
        if relation_obj.sort_order != index:
            relation_obj.sort_order = index
            relation_obj.save(update_fields=('sort_order',))
        links_to_keep.append(relation_obj.id)

    relation_model.objects.filter(**{parent_field: parent_obj}).exclude(id__in=links_to_keep).delete()


def sync_show_people(show, tmdb_show_credits):
    sync_people_links(show, tmdb_show_credits, ShowPerson, 'show')


def sync_season_people(season, tmdb_season_credits):
    sync_people_links(season, tmdb_season_credits, SeasonPerson, 'season')


def sync_episode_people(episode, tmdb_episode_credits):
    sync_people_links(episode, tmdb_episode_credits, EpisodePerson, 'episode')


def get_tmdb_show(tmdb_id):
    key = get_tmdb_show_key(tmdb_id)
    tmdb_show = cache.get(key, None)
    if tmdb_show is None:
        tmdb_show = tmdb.TV(tmdb_id).info(language=LANGUAGE)
        cache.set(key, tmdb_show, CACHE_TIMEOUT)
    return tmdb_show


def get_tmdb_show_videos(tmdb_id):
    key = f'show_{tmdb_id}_videos'
    tmdb_show_videos = cache.get(key, None)
    if tmdb_show_videos is None:
        tmdb_show_videos = tmdb.TV(tmdb_id).videos(language=LANGUAGE)['results']
        cache.set(key, tmdb_show_videos, CACHE_TIMEOUT)
    return tmdb_show_videos


def get_tmdb_show_credits(tmdb_id):
    key = f'show_{tmdb_id}_credits'
    tmdb_show_credits = cache.get(key, None)
    if tmdb_show_credits is None:
        tmdb_show_credits = tmdb.TV(tmdb_id).credits(language=LANGUAGE)
        cache.set(key, tmdb_show_credits, CACHE_TIMEOUT)
    return tmdb_show_credits


def get_tmdb_season(show_tmdb_id, season_number):
    key = get_tmdb_season_key(show_tmdb_id, season_number)
    tmdb_season = cache.get(key, None)
    if tmdb_season is None:
        tmdb_season = tmdb.TV_Seasons(show_tmdb_id, season_number).info(language=LANGUAGE)
        cache.set(key, tmdb_season, CACHE_TIMEOUT)
    return tmdb_season


def get_tmdb_season_credits(show_tmdb_id, season_number):
    key = f'show_{show_tmdb_id}_season_{season_number}_credits'
    tmdb_season_credits = cache.get(key, None)
    if tmdb_season_credits is None:
        tmdb_season_credits = tmdb.TV_Seasons(show_tmdb_id, season_number).credits(language=LANGUAGE)
        cache.set(key, tmdb_season_credits, CACHE_TIMEOUT)
    return tmdb_season_credits


def get_tmdb_episode(show_tmdb_id, season_number, episode_number):
    key = get_tmdb_episode_key(show_tmdb_id, season_number, episode_number)
    tmdb_episode = cache.get(key, None)
    if tmdb_episode is None:
        tmdb_episode = tmdb.TV_Episodes(show_tmdb_id, season_number, episode_number).info(language=LANGUAGE)
        cache.set(key, tmdb_episode, CACHE_TIMEOUT)
    return tmdb_episode


def get_tmdb_episode_credits(show_tmdb_id, season_number, episode_number):
    key = f'show_{show_tmdb_id}_season_{season_number}_episode_{episode_number}_credits'
    tmdb_episode_credits = cache.get(key, None)
    if tmdb_episode_credits is None:
        tmdb_episode_credits = tmdb.TV_Episodes(show_tmdb_id, season_number, episode_number).credits(language=LANGUAGE)
        cache.set(key, tmdb_episode_credits, CACHE_TIMEOUT)
    return tmdb_episode_credits


def upsert_season_from_tmdb(show, tmdb_season):
    season_number = tmdb_season.get('season_number')
    if season_number is None:
        return None

    defaults = get_season_new_fields(tmdb_season, show.id)
    season, created = show.season_set.get_or_create(tmdb_season_number=season_number, defaults=defaults)
    if not created:
        update_fields_if_needed(season, defaults)
    return season


def upsert_episode_from_tmdb(season, tmdb_episode):
    episode_number = tmdb_episode.get('episode_number')
    if episode_number is None:
        return None

    defaults = get_episode_new_fields(tmdb_episode, season.id)
    episode, created = season.episode_set.get_or_create(tmdb_episode_number=episode_number, defaults=defaults)
    if not created:
        update_fields_if_needed(episode, defaults)
    return episode


# cache keys
def get_tmdb_show_key(tmdb_id):
    return f'show_{tmdb_id}'


def get_tmdb_season_key(show_tmdb_id, season_number):
    return f'show_{show_tmdb_id}_season_{season_number}'


def get_tmdb_episode_key(show_tmdb_id, season_number, episode_number):
    return f'show_{show_tmdb_id}_season_{season_number}_episode_{episode_number}'
