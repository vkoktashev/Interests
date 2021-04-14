import decimal

from django.db.models import DecimalField, IntegerField, CharField

from users.models import UserFollow
from utils.openapi_params import DEFAULT_PAGE_SIZE


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


def field_is_changed(choices_dict, field, fields, old_fields, class_meta):
    if field in choices_dict:
        if old_fields is None:
            class_meta_field = class_meta.get_field(field)

            if fields[field] is None:
                return False
            if isinstance(class_meta_field, DecimalField):
                if decimal.Decimal(fields[field]) == class_meta_field.get_default():
                    return False
            elif isinstance(class_meta_field, IntegerField):
                if int(fields[field]) == class_meta_field.get_default():
                    return False
            elif isinstance(class_meta_field, CharField):
                if class_meta_field.choices is not None and \
                        str(fields[field]) == dict(class_meta_field.choices).get(class_meta_field.get_default()):
                    return False

                if str(fields[field]) == class_meta_field.get_default():
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


def update_fields_if_needed(obj, new_fields):
    fields_to_update = []
    for key, value in new_fields.items():
        if str(value) != str(getattr(obj, key)):
            obj.__setattr__(key, value)
            fields_to_update.append(key)

    obj.save(update_fields=fields_to_update)


def update_fields_if_needed_without_save(obj, new_fields):
    fields_to_update = []
    for key, value in new_fields.items():
        if str(value) != str(getattr(obj, key)):
            obj.__setattr__(key, value)
            fields_to_update.append(key)


# cache keys
def get_rawg_game_key(slug):
    return f'game_{slug}'


def get_tmdb_movie_key(tmdb_id):
    return f'movie_{tmdb_id}'


def get_tmdb_show_key(tmdb_id):
    return f'show_{tmdb_id}'


def get_tmdb_season_key(show_tmdb_id, season_number):
    return f'show_{show_tmdb_id}_season_{season_number}'


def get_tmdb_episode_key(show_tmdb_id, season_number, episode_number):
    return f'show_{show_tmdb_id}_season_{season_number}_episode_{episode_number}'


def objects_to_str(objects):
    return ', '.join(obj['name'] for obj in objects)


def is_user_available(current_user, target_user):
    if current_user != target_user:
        if target_user.privacy == target_user.PRIVACY_NOBODY:
            return False

        try:
            current_user_is_followed = UserFollow.objects.get(user=target_user, followed_user=current_user).is_following
        except (UserFollow.DoesNotExist, TypeError):
            current_user_is_followed = False

        if target_user.privacy == target_user.PRIVACY_FOLLOWED and not current_user_is_followed:
            return False

    return True
