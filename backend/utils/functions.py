import decimal
import re
from difflib import SequenceMatcher

from django.db.models import DecimalField, IntegerField, CharField

from games.models import UserGame
from utils.openapi_params import DEFAULT_PAGE_SIZE


def similar(a, b):
    """ This function calculate how much the first string is similar to the second string
    :param a: First String
    :param b: Second String
    :return: Return the similarity between the two string (0.0-1.0)
    """

    game_name_numbers = []
    for word in a.split(" "):
        if word.isdigit():
            game_name_numbers.append(word)

    if a is None or b is None:
        return 0
    similarity = SequenceMatcher(None, a, b).ratio()
    if game_name_numbers is not None and len(game_name_numbers) > 0:  # additional check about numbers in the string
        number_found = False
        cleaned = re.sub(r'([^\s\w]|_)+', '', b)
        for word in cleaned.split(" "):  # check for every word
            if word.isdigit():  # if is a digit
                for number_entry in game_name_numbers:  # compare it with numbers in the begin string
                    if str(number_entry) == str(word):
                        number_found = True
                        break
        if not number_found:  # number in the given string not in this one, reduce prob
            similarity -= 0.1
    return similarity


def translate_hltb_time(hltb_game, time, time_unit):
    if hltb_game is None or hltb_game.get(time) == -1:
        return

    gameplay_time = ''
    for s in hltb_game.get(time):
        if s.isdigit():
            gameplay_time += s
        else:
            break
    gameplay_time = int(gameplay_time)

    gameplay_unit = hltb_game.get(time_unit)
    if gameplay_unit == 'Hours':
        gameplay_unit = int_to_hours(gameplay_time)
    elif gameplay_unit == 'Mins':
        gameplay_unit = int_to_minutes(gameplay_time)
    hltb_game.update({time_unit: gameplay_unit})


def int_to_hours(number):
    if 11 <= number <= 14:
        return 'часов'
    elif number % 10 == 1:
        return 'час'
    elif 2 <= number % 10 <= 4:
        return 'часа'
    else:
        return 'часов'


def int_to_minutes(number):
    if 1 <= number % 10 <= 4 and number <= 14:
        return 'минут'
    elif number % 10 == 1:
        return 'минута'
    elif 2 <= number % 10 <= 4:
        return 'минуты'
    else:
        return 'минут'


def field_is_changed(choices_dict, field, fields, old_fields, default_int):
    if field in choices_dict:
        if old_fields is None:
            if fields[field] is None:
                return False
            if isinstance(UserGame._meta.get_field(field), DecimalField):
                if decimal.Decimal(fields[field]) == 0:
                    return False
            elif isinstance(UserGame._meta.get_field(field), IntegerField):
                if int(fields[field]) == default_int:
                    return False
            elif isinstance(UserGame._meta.get_field(field), CharField):
                if str(fields[field]) == '':
                    return False
            return True
        elif fields[field] != old_fields[field]:
            return True
        else:
            return False


def get_page_size(page_size):
    try:
        page_size = int(page_size)
        if page_size < 1:
            page_size = DEFAULT_PAGE_SIZE
    except (ValueError, TypeError):
        page_size = DEFAULT_PAGE_SIZE

    return page_size
