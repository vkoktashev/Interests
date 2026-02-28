from datetime import date

from django.core.cache import cache
from django.utils import timezone

from utils.constants import rawg, CACHE_TIMEOUT
from utils.functions import objects_to_str


def parse_rawg_released_date(value):
    if not value:
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None
    return None


def get_game_new_fields(rawg_game):
    if rawg_game.get('background_image_additional') is not None:
        backdrop_path = rawg_game.get('background_image_additional')
    elif rawg_game.get('background_image') is not None:
        backdrop_path = rawg_game.get('background_image')
    else:
        backdrop_path = ''

    if rawg_game.get('background_image') is not None:
        poster_path = rawg_game.get('background_image')
    else:
        poster_path = ''

    platforms = [obj.get('platform') for obj in (rawg_game.get('platforms') or []) if obj.get('platform')]

    result = {
        'rawg_id': rawg_game.get('id'),
        'rawg_slug': rawg_game.get('slug'),
        'rawg_name': rawg_game.get('name'),
        'rawg_release_date': parse_rawg_released_date(rawg_game.get('released')),
        'rawg_tba': rawg_game.get('tba'),
        'rawg_backdrop_path': backdrop_path,
        'rawg_poster_path': poster_path,
        'rawg_description': rawg_game.get('description') or '',
        'rawg_metacritic': rawg_game.get('metacritic'),
        'rawg_platforms': objects_to_str(platforms),
        'rawg_playtime': rawg_game.get('playtime') or 0,
        'rawg_last_update': timezone.now(),
    }

    return result


# cache keys
def get_rawg_game_key(slug):
    return f'game_{slug}'


def get_hltb_game_key(game_name):
    return f'hltb_search_{game_name.replace(" ", "_")}'


def get_rawg_game_trailers_key(slug):
    return f'game_{slug}_trailers'


def parse_rawg_game_trailers(rawg_movies_payload):
    parsed_trailers = []
    for trailer in (rawg_movies_payload or {}).get('results') or []:
        trailer_data = trailer.get('data') or {}
        trailer_url = trailer_data.get('max') or trailer_data.get('480') or trailer_data.get('320')
        preview_url = trailer.get('preview')

        if not trailer_url and not preview_url:
            continue

        parsed_trailers.append({
            'id': trailer.get('id'),
            'name': trailer.get('name') or '',
            'preview': preview_url or '',
            'url': trailer_url or '',
            'data': {
                'max': trailer_data.get('max') or '',
                '480': trailer_data.get('480') or '',
                '320': trailer_data.get('320') or '',
            },
        })

    return parsed_trailers


def get_rawg_game_trailers(slug):
    key = get_rawg_game_trailers_key(slug)
    trailers = cache.get(key, None)

    if trailers is None:
        rawg_movies_payload = rawg.get_request(f'https://rawg.io/api/games/{slug}/movies?key={rawg.key}')
        trailers = parse_rawg_game_trailers(rawg_movies_payload)
        cache.set(key, trailers, CACHE_TIMEOUT)

    return trailers
