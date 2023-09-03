from shows.models import Episode
from utils.constants import TMDB_BACKDROP_PATH_PREFIX, TMDB_POSTER_PATH_PREFIX
from utils.functions import update_fields_if_needed


def get_episodes_to_create_update_delete(existed_episodes, episodes_to_check, season_id):
    episodes_to_create = []
    episodes_to_update = []
    episodes_to_delete_pks = []

    for existed_episode in existed_episodes:
        exists = False
        for episode in episodes_to_check:
            if episode['id'] == existed_episode.tmdb_id or \
                    episode['episode_number'] == existed_episode.tmdb_episode_number:
                exists = True
                episode['exists'] = True
                new_fields = get_episode_new_fields(episode, season_id)
                update_fields_if_needed(existed_episode, new_fields, need_save=False)
                episodes_to_update.append(existed_episode)
                break

        if not exists:
            episodes_to_delete_pks.append(existed_episode.pk)

    for episode in episodes_to_check:
        if episode.get('exists'):
            del episode['exists']
        else:
            episodes_to_create.append(Episode(tmdb_id=episode.get('id'),
                                              tmdb_episode_number=episode.get('episode_number'),
                                              tmdb_season_id=season_id,
                                              tmdb_release_date=episode.get('air_date')
                                              if episode.get('air_date') != "" else None,
                                              tmdb_name=episode.get('name'),
                                              tmdb_runtime=episode.get('runtime')
                                              if episode.get('runtime') is not None
                                              else 0))
    return episodes_to_create, episodes_to_update, episodes_to_delete_pks


def get_show_new_fields(tmdb_show):
    result = {
        'imdb_id': tmdb_show.get('imdb_id') if tmdb_show.get('imdb_id') is not None else '',
        'tmdb_original_name': tmdb_show['original_name'],
        'tmdb_name': tmdb_show['name'],
        'tmdb_episode_runtime': tmdb_show['episode_run_time'][0] if len(tmdb_show['episode_run_time']) > 0 else 0,
        'tmdb_backdrop_path': TMDB_BACKDROP_PATH_PREFIX + tmdb_show['backdrop_path']
        if tmdb_show['backdrop_path'] else '',
        'tmdb_poster_path': TMDB_POSTER_PATH_PREFIX + tmdb_show['poster_path']
        if tmdb_show.get('poster_path') is not None else '',
        'tmdb_release_date': tmdb_show['first_air_date'] if tmdb_show['first_air_date'] != "" else None,
        'tmdb_status': tmdb_show.get('status'),
        'tmdb_number_of_episodes': tmdb_show.get('number_of_episodes')
    }

    return result


def get_season_new_fields(tmdb_season):
    result = {
        'tmdb_id': tmdb_season.get('id'),
        'tmdb_name': tmdb_season.get('name'),
    }

    return result


def get_episode_new_fields(tmdb_episode, season_id):
    result = {
        'tmdb_id': tmdb_episode.get('id'),
        'tmdb_episode_number': tmdb_episode.get('episode_number'),
        'tmdb_season_id': season_id,
        'tmdb_name': tmdb_episode.get('name'),
        'tmdb_release_date': tmdb_episode.get('air_date') if tmdb_episode.get('air_date') != "" else None,
        'tmdb_runtime': tmdb_episode.get('runtime') if tmdb_episode.get('runtime') is not None else 0
    }
    return result


# cache keys
def get_tmdb_show_key(tmdb_id):
    return f'show_{tmdb_id}'


def get_tmdb_season_key(show_tmdb_id, season_number):
    return f'show_{show_tmdb_id}_season_{season_number}'


def get_tmdb_episode_key(show_tmdb_id, season_number, episode_number):
    return f'show_{show_tmdb_id}_season_{season_number}_episode_{episode_number}'
