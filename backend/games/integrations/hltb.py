from datetime import date
from decimal import Decimal

from django.core.cache import cache
from howlongtobeatpy import HowLongToBeat
from requests.exceptions import ConnectionError

from games.functions import get_hltb_game_key
from utils.constants import CACHE_TIMEOUT
from utils.functions import float_to_hours


def get_game_release_year(value):
    if not value:
        return None
    if isinstance(value, date):
        return value.year
    if isinstance(value, str):
        try:
            return date.fromisoformat(value).year
        except ValueError:
            return None
    return None


def translate_hltb_time(hltb_game, time_key, new_time_key, time_unit):
    if hltb_game is None or hltb_game.get(time_key) == -1:
        return

    gameplay_time = hltb_game.get(time_key)
    gameplay_unit = float_to_hours(gameplay_time)
    hltb_game.update({new_time_key: gameplay_time, time_unit: gameplay_unit})


def get_hltb_game(game_name: str, release_year: int):
    key = get_hltb_game_key(game_name)
    hltb_game = cache.get(key, None)
    game_name = game_name.replace('’', '\'')
    if hltb_game is None:
        try:
            results = HowLongToBeat(1).search(game_name, similarity_case_sensitive=False)
            if len(results) == 0:
                results = HowLongToBeat(1).search(game_name.split('(')[0].strip(), similarity_case_sensitive=False)

            same_year_games = [x for x in results if x.release_world == release_year]
            if len(results) == 0 or len(same_year_games) > 0:
                results = same_year_games

            hltb_game = max(results, key=lambda element: element.similarity).__dict__
            cache.set(key, hltb_game, CACHE_TIMEOUT)
        except (ValueError, TypeError):
            hltb_game = None
            cache.set(key, hltb_game, CACHE_TIMEOUT)
        except (ConnectionError, AttributeError):
            hltb_game = None

    translate_hltb_time(hltb_game, 'main_story', 'gameplay_main', 'gameplay_main_unit')
    translate_hltb_time(hltb_game, 'main_extra', 'gameplay_main_extra', 'gameplay_main_extra_unit')
    translate_hltb_time(hltb_game, 'completionist', 'gameplay_completionist', 'gameplay_completionist_unit')

    return hltb_game


def extract_hltb_hours_map(hltb_game):
    if not isinstance(hltb_game, dict):
        return {}

    mapping = {
        'main': hltb_game.get('main_story'),
        'extra': hltb_game.get('main_extra'),
        'complete': hltb_game.get('completionist'),
    }
    result = {}
    for key, value in mapping.items():
        if value in (None, -1):
            continue
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            continue
        if numeric <= 0:
            continue
        result[key] = Decimal(str(numeric)).quantize(Decimal('0.01'))
    return result


def build_hltb_response_from_hours(hours_map):
    response = {
        'gameplay_main': -1,
        'gameplay_main_unit': 'часов',
        'gameplay_main_extra': -1,
        'gameplay_main_extra_unit': 'часов',
        'gameplay_completionist': -1,
        'gameplay_completionist_unit': 'часов',
    }

    if hours_map.get('main') is not None:
        value = float(hours_map['main'])
        response['gameplay_main'] = value
        response['gameplay_main_unit'] = float_to_hours(value)
    if hours_map.get('extra') is not None:
        value = float(hours_map['extra'])
        response['gameplay_main_extra'] = value
        response['gameplay_main_extra_unit'] = float_to_hours(value)
    if hours_map.get('complete') is not None:
        value = float(hours_map['complete'])
        response['gameplay_completionist'] = value
        response['gameplay_completionist_unit'] = float_to_hours(value)

    return response
