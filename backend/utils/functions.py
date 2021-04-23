import decimal

from django.db.models import DecimalField, IntegerField, CharField

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


def update_fields_if_needed(obj, new_fields, need_save=True):
    fields_to_update = []
    for key, value in new_fields.items():
        if str(value) != str(getattr(obj, key)):
            obj.__setattr__(key, value)
            fields_to_update.append(key)

    if need_save:
        obj.save(update_fields=fields_to_update)


def objects_to_str(objects):
    return ', '.join(obj['name'] for obj in objects)
