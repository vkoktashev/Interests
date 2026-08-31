from asgiref.sync import sync_to_async

from utils.openapi_params import DEFAULT_PAGE_SIZE


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


@sync_to_async
def async_save(obj, fields_to_update):
    obj.save(update_fields=fields_to_update)


async def update_fields_if_needed_async(obj, new_fields, need_save=True):
    fields_to_update = []
    for key, value in new_fields.items():
        if str(value) != str(getattr(obj, key)):
            obj.__setattr__(key, value)
            fields_to_update.append(key)

    if need_save:
        await async_save(obj, fields_to_update)


def objects_to_str(objects):
    return ', '.join(obj['name'] for obj in objects)


def get_english_translation_data(tmdb_data):
    translations = (tmdb_data.get('translations') or {}).get('translations') or []
    for translation in translations:
        if translation.get('iso_639_1') == 'en':
            return translation.get('data') or {}
    return {}


def resolve_display_name(localized_name, original_name, english_name, original_language):
    has_russian = original_language == 'ru' or bool(localized_name and localized_name != original_name)
    if has_russian:
        return localized_name
    if english_name:
        return english_name
    return localized_name or original_name
