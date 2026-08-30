import tmdbsimple as tmdb
from django.core.cache import cache
from django.db import transaction
from django.db.models.deletion import ProtectedError
from django.utils import timezone

from people.models import Person
from shows.models import Episode, ShowGenre, ShowPerson, SeasonPerson, EpisodePerson, UserSeason, SeasonLog, \
    UserEpisode, EpisodeLog
from utils.constants import TMDB_BACKDROP_PATH_PREFIX, TMDB_POSTER_PATH_PREFIX, TMDB_STILL_PATH_PREFIX, LANGUAGE, \
    CACHE_TIMEOUT, TMDB_TRAILER_TYPE, TMDB_VIDEO_LANGUAGES
from utils.functions import update_fields_if_needed, get_english_translation_data


def get_show_new_fields(tmdb_show):
    english_translation = get_english_translation_data(tmdb_show)
    season_numbers = sorted({
        season.get('season_number')
        for season in (tmdb_show.get('seasons') or [])
        if season.get('season_number') is not None
    })
    return {
        'imdb_id': tmdb_show.get('imdb_id') if tmdb_show.get('imdb_id') is not None else '',
        'tmdb_original_name': tmdb_show.get('original_name') or '',
        'tmdb_name': tmdb_show.get('name') or '',
        'tmdb_name_en': english_translation.get('name') or '',
        'tmdb_original_language': tmdb_show.get('original_language') or '',
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
        'tmdb_season_numbers': season_numbers,
        'tmdb_overview': tmdb_show.get('overview') or '',
        'tmdb_overview_en': english_translation.get('overview') or '',
        'tmdb_score': int(tmdb_show['vote_average'] * 10) if tmdb_show.get('vote_average') is not None else None,
        'tmdb_production_companies': ', '.join(
            company.get('name', '') for company in (tmdb_show.get('production_companies') or []) if company.get('name')
        ),
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


def sync_people_links(
        parent_obj,
        tmdb_credits,
        relation_model,
        parent_field,
        extra_people_by_role=None,
        cast_limit=5,
        sync_profile_paths=False,
        sync_cast_details=False,
):
    cast = tmdb_credits.get('cast') or []
    if cast_limit is not None:
        cast = cast[:cast_limit]
    crew = tmdb_credits.get('crew') or []
    directors = [person for person in crew if is_director_credit(person)]
    links_to_keep = []

    links_to_keep.extend(sync_people_role_links(
        parent_obj,
        cast,
        relation_model,
        parent_field,
        relation_model.ROLE_ACTOR,
        sync_profile_path=sync_profile_paths,
        sync_cast_details=sync_cast_details,
        use_tmdb_order=sync_cast_details,
    ))
    links_to_keep.extend(sync_people_role_links(
        parent_obj,
        directors,
        relation_model,
        parent_field,
        relation_model.ROLE_DIRECTOR,
        sync_profile_path=sync_profile_paths,
        sync_director_details=sync_cast_details,
    ))

    for role, people in (extra_people_by_role or {}).items():
        links_to_keep.extend(
            sync_people_role_links(
                parent_obj,
                people,
                relation_model,
                parent_field,
                role,
                sync_profile_path=sync_profile_paths,
            )
        )

    relation_model.objects.filter(**{parent_field: parent_obj}).exclude(id__in=links_to_keep).delete()


def sync_people_role_links(
        parent_obj,
        people,
        relation_model,
        parent_field,
        role,
        sync_profile_path=False,
        sync_cast_details=False,
        sync_director_details=False,
        use_tmdb_order=False,
):
    links_to_keep = []

    for index, person_data in enumerate(people):
        person_id = person_data.get('id')
        person_name = person_data.get('name')
        if person_id is None or not person_name:
            continue

        profile_path = get_person_profile_path(person_data) if sync_profile_path else ''
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

        tmdb_order = person_data.get('order')
        sort_order = tmdb_order if use_tmdb_order and isinstance(tmdb_order, int) and tmdb_order >= 0 else index
        relation_defaults = {'sort_order': sort_order}
        if sync_cast_details:
            character, episode_count = get_aggregate_cast_details(person_data)
            relation_defaults.update({
                'character': character,
                'episode_count': episode_count,
            })
        elif sync_director_details:
            episode_count = get_aggregate_director_episode_count(person_data)
            relation_defaults['episode_count'] = episode_count

        relation_obj, _ = relation_model.objects.get_or_create(
            **{
                parent_field: parent_obj,
                'person': person_obj,
                'role': role
            },
            defaults=relation_defaults,
        )
        relation_fields_to_update = []
        if relation_obj.sort_order != sort_order:
            relation_obj.sort_order = sort_order
            relation_fields_to_update.append('sort_order')
        if sync_cast_details:
            if relation_obj.character != character:
                relation_obj.character = character
                relation_fields_to_update.append('character')
            if relation_obj.episode_count != episode_count:
                relation_obj.episode_count = episode_count
                relation_fields_to_update.append('episode_count')
        elif sync_director_details and relation_obj.episode_count != episode_count:
            relation_obj.episode_count = episode_count
            relation_fields_to_update.append('episode_count')
        if relation_fields_to_update:
            relation_obj.save(update_fields=relation_fields_to_update)
        links_to_keep.append(relation_obj.id)

    return links_to_keep


def get_person_profile_path(person_data):
    if not person_data.get('profile_path'):
        return ''
    return TMDB_POSTER_PATH_PREFIX + person_data['profile_path']


def get_aggregate_cast_details(person_data):
    roles = person_data.get('roles') or []
    characters = []
    for role in roles:
        character = role.get('character')
        if character and character not in characters:
            characters.append(character)

    if not characters and person_data.get('character'):
        characters.append(person_data['character'])

    episode_count = person_data.get('total_episode_count')
    if not isinstance(episode_count, int) or episode_count < 0:
        episode_count = sum(
            role.get('episode_count')
            for role in roles
            if isinstance(role.get('episode_count'), int) and role.get('episode_count') >= 0
        )

    return ', '.join(characters)[:500], episode_count


def get_aggregate_director_episode_count(person_data):
    director_episode_counts = [
        job.get('episode_count')
        for job in (person_data.get('jobs') or [])
        if job.get('job') == 'Director'
        and isinstance(job.get('episode_count'), int)
        and job.get('episode_count') >= 0
    ]
    if director_episode_counts:
        return sum(director_episode_counts)

    if person_data.get('job') == 'Director':
        episode_count = person_data.get('total_episode_count', person_data.get('episode_count', 0))
        if isinstance(episode_count, int) and episode_count >= 0:
            return episode_count

    return 0


def is_director_credit(person_data):
    if person_data.get('job') == 'Director':
        return True
    return any(job.get('job') == 'Director' for job in (person_data.get('jobs') or []))


def sync_show_people(show, tmdb_show_credits, tmdb_show):
    creators = (tmdb_show.get('created_by') or [])
    sync_people_links(
        show,
        tmdb_show_credits,
        ShowPerson,
        'show',
        {ShowPerson.ROLE_CREATOR: creators},
        cast_limit=None,
        sync_profile_paths=True,
        sync_cast_details=True,
    )


def sync_season_people(season, tmdb_season_credits):
    sync_people_links(season, tmdb_season_credits, SeasonPerson, 'season')


def sync_episode_people(episode, tmdb_episode_credits):
    sync_people_links(episode, tmdb_episode_credits, EpisodePerson, 'episode')


def get_tmdb_show(tmdb_id):
    key = get_tmdb_show_key(tmdb_id)
    tmdb_show = cache.get(key, None)
    if tmdb_show is None:
        tmdb_show = tmdb.TV(tmdb_id).info(language=LANGUAGE, append_to_response='translations')
        cache.set(key, tmdb_show, CACHE_TIMEOUT)
    return tmdb_show


def get_tmdb_show_videos(tmdb_id):
    key = f'show_{tmdb_id}_trailers_{TMDB_VIDEO_LANGUAGES.replace(",", "_")}'
    tmdb_show_videos = cache.get(key, None)
    if tmdb_show_videos is None:
        tmdb_show_videos = tmdb.TV(tmdb_id).videos(
            language=LANGUAGE,
            include_video_language=TMDB_VIDEO_LANGUAGES,
        )['results']
        tmdb_show_videos = [
            video for video in tmdb_show_videos
            if video.get('type') == TMDB_TRAILER_TYPE
        ]
        cache.set(key, tmdb_show_videos, CACHE_TIMEOUT)
    return tmdb_show_videos


def get_tmdb_show_credits(tmdb_id):
    key = f'show_{tmdb_id}_aggregate_credits'
    tmdb_show_credits = cache.get(key, None)
    if tmdb_show_credits is None:
        tmdb_show_credits = tmdb.TV(tmdb_id).aggregate_credits(
            language=LANGUAGE,
        )
        cache.set(key, tmdb_show_credits, CACHE_TIMEOUT)
    return tmdb_show_credits


def get_tmdb_show_recommendations(tmdb_id, page=1):
    key = f'show_{tmdb_id}_recommendations_{LANGUAGE.replace("-", "_")}_{page}'
    tmdb_recommendations = cache.get(key, None)
    if tmdb_recommendations is None:
        tmdb_recommendations = tmdb.TV(tmdb_id).recommendations(language=LANGUAGE, page=page)
        cache.set(key, tmdb_recommendations, CACHE_TIMEOUT)

    return tmdb_recommendations or {'page': page, 'total_pages': 1, 'total_results': 0, 'results': []}


def get_tmdb_season(show_tmdb_id, season_number):
    key = get_tmdb_season_key(show_tmdb_id, season_number)
    tmdb_season = cache.get(key, None)
    if tmdb_season is None:
        tmdb_season = tmdb.TV_Seasons(show_tmdb_id, season_number).info(language=LANGUAGE)
        cache.set(key, tmdb_season, CACHE_TIMEOUT)
    return tmdb_season


def get_tmdb_season_videos(show_tmdb_id, season_number):
    key = (
        f'show_{show_tmdb_id}_season_{season_number}_trailers_'
        f'{TMDB_VIDEO_LANGUAGES.replace(",", "_")}'
    )
    tmdb_season_videos = cache.get(key, None)
    if tmdb_season_videos is None:
        payload = tmdb.TV_Seasons(show_tmdb_id, season_number).videos(
            language=LANGUAGE,
            include_video_language=TMDB_VIDEO_LANGUAGES,
        )
        tmdb_season_videos = [
            video for video in (payload.get('results') or [])
            if video.get('type') == TMDB_TRAILER_TYPE
        ]
        cache.set(key, tmdb_season_videos, CACHE_TIMEOUT)
    return tmdb_season_videos


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


def get_tmdb_episode_videos(show_tmdb_id, season_number, episode_number):
    key = (
        f'show_{show_tmdb_id}_season_{season_number}_episode_{episode_number}_trailers_'
        f'{TMDB_VIDEO_LANGUAGES.replace(",", "_")}'
    )
    tmdb_episode_videos = cache.get(key, None)
    if tmdb_episode_videos is None:
        payload = tmdb.TV_Episodes(show_tmdb_id, season_number, episode_number).videos(
            language=LANGUAGE,
            include_video_language=TMDB_VIDEO_LANGUAGES,
        )
        tmdb_episode_videos = [
            video for video in (payload.get('results') or [])
            if video.get('type') == TMDB_TRAILER_TYPE
        ]
        cache.set(key, tmdb_episode_videos, CACHE_TIMEOUT)
    return tmdb_episode_videos


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


@transaction.atomic
def sync_show_seasons(show, tmdb_seasons):
    if tmdb_seasons is None:
        return {'synced': 0, 'deleted': 0, 'retained': 0}

    tmdb_seasons_by_number = {
        season.get('season_number'): season
        for season in tmdb_seasons
        if season.get('season_number') is not None
    }
    tmdb_season_numbers = set(tmdb_seasons_by_number)
    database_seasons = list(show.season_set.all())
    database_season_numbers = {season.tmdb_season_number for season in database_seasons}
    stale_season_numbers = database_season_numbers - tmdb_season_numbers

    for tmdb_season in tmdb_seasons_by_number.values():
        upsert_season_from_tmdb(show, tmdb_season)

    canonical_season_numbers = sorted(tmdb_season_numbers)
    if show.tmdb_season_numbers != canonical_season_numbers:
        show.tmdb_season_numbers = canonical_season_numbers
        show.save(update_fields=['tmdb_season_numbers'])

    deleted_count = 0
    retained_count = 0
    for season in database_seasons:
        if season.tmdb_season_number not in stale_season_numbers:
            continue

        if season_has_user_data(season):
            retained_count += 1
            continue

        try:
            season.delete()
            deleted_count += 1
        except ProtectedError:
            retained_count += 1

    return {
        'synced': len(tmdb_seasons_by_number),
        'deleted': deleted_count,
        'retained': retained_count,
    }


def season_has_user_data(season):
    return (
        UserSeason.objects.filter(season=season).exists() or
        SeasonLog.objects.filter(season=season).exists() or
        UserEpisode.objects.filter(episode__tmdb_season=season).exists() or
        EpisodeLog.objects.filter(episode__tmdb_season=season).exists()
    )


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


def clear_tmdb_show_cache(tmdb_id):
    cache.delete_many((
        get_tmdb_show_key(tmdb_id),
        f'show_{tmdb_id}_videos',
        f'show_{tmdb_id}_videos_{TMDB_VIDEO_LANGUAGES.replace(",", "_")}',
        f'show_{tmdb_id}_trailers_{TMDB_VIDEO_LANGUAGES.replace(",", "_")}',
        f'show_{tmdb_id}_credits',
        f'show_{tmdb_id}_aggregate_credits',
    ))


def clear_tmdb_season_cache(show_tmdb_id, season_number):
    cache.delete_many((
        get_tmdb_season_key(show_tmdb_id, season_number),
        f'show_{show_tmdb_id}_season_{season_number}_credits',
    ))


def clear_tmdb_episode_cache(show_tmdb_id, season_number, episode_number):
    cache.delete_many((
        get_tmdb_episode_key(show_tmdb_id, season_number, episode_number),
        f'show_{show_tmdb_id}_season_{season_number}_episode_{episode_number}_credits',
    ))
