from django.db import transaction
from django.db.models import Max

from content_collections.media import (
    MEDIA_CONFIG,
    get_collection_content_keys,
    get_media_item,
)
from content_collections.models import Collection, CollectionItemOrder


class CollectionInputError(Exception):
    pass


class CollectionItemNotFoundError(Exception):
    pass


@transaction.atomic
def create_collection(serializer, author, requested_items):
    resolved_items = _resolve_requested_content(requested_items)
    captions = [_validate_caption(item.get('caption', '')) for item in requested_items]
    collection = serializer.save(author=author)

    relation_items = {'games': [], 'movies': [], 'shows': []}
    for _, _, relation_name, item in resolved_items:
        relation_items[relation_name].append(item)
    for relation_name, items in relation_items.items():
        if items:
            getattr(collection, relation_name).add(*items)

    CollectionItemOrder.objects.bulk_create([
        CollectionItemOrder(
            collection=collection,
            media_type=media_type,
            object_id=object_id,
            position=position,
            caption=captions[position],
        )
        for position, (media_type, object_id, _, _) in enumerate(resolved_items)
    ])
    return collection


@transaction.atomic
def clone_collection(collection, author):
    collection = _lock_collection(collection)
    _sync_collection_item_orders(collection)

    cloned_collection = Collection.objects.create(
        author=author,
        title=collection.title,
        description=collection.description,
        display_mode=collection.display_mode,
        privacy=collection.privacy,
    )
    for relation_name in ('games', 'movies', 'shows'):
        getattr(cloned_collection, relation_name).set(
            getattr(collection, relation_name).all()
        )

    CollectionItemOrder.objects.bulk_create([
        CollectionItemOrder(
            collection=cloned_collection,
            media_type=item_order.media_type,
            object_id=item_order.object_id,
            position=item_order.position,
            caption=item_order.caption,
        )
        for item_order in collection.item_orders.order_by('position', 'id')
    ])
    return cloned_collection


@transaction.atomic
def add_collection_item(collection, media_type, object_id):
    collection = _lock_collection(collection)
    item, relation_name, error = get_media_item(media_type, object_id)
    if error == 'Контент не найден.':
        raise CollectionItemNotFoundError(error)
    if error:
        raise CollectionInputError(error)

    relation = getattr(collection, relation_name)
    was_added = not relation.filter(pk=item.pk).exists()
    _sync_collection_item_orders(collection)
    if not was_added:
        return False

    relation.add(item)
    max_position = collection.item_orders.aggregate(max_position=Max('position'))['max_position']
    next_position = 0 if max_position is None else max_position + 1
    CollectionItemOrder.objects.create(
        collection=collection,
        media_type=media_type,
        object_id=item.pk,
        position=next_position,
    )
    collection.save(update_fields=('updated_at',))
    return True


@transaction.atomic
def reorder_collection_items(collection, items):
    collection = _lock_collection(collection)
    if not isinstance(items, list):
        raise CollectionInputError('Порядок элементов должен быть списком.')

    normalized_items = []
    for item in items:
        if not isinstance(item, dict) or item.get('media_type') not in MEDIA_CONFIG:
            raise CollectionInputError('Некорректный элемент подборки.')
        try:
            object_id = int(item.get('object_id'))
        except (TypeError, ValueError) as error:
            raise CollectionInputError('Некорректный элемент подборки.') from error
        normalized_items.append((item['media_type'], object_id))

    expected_items = set(get_collection_content_keys(collection))
    if len(normalized_items) != len(expected_items) or set(normalized_items) != expected_items:
        raise CollectionInputError(
            'Порядок должен содержать все элементы подборки без повторов.'
        )

    existing_captions = {
        (item.media_type, item.object_id): item.caption
        for item in collection.item_orders.all()
    }
    captions = [
        _validate_caption(item.get('caption', existing_captions.get(key, '')))
        for item, key in zip(items, normalized_items)
    ]
    collection.item_orders.all().delete()
    CollectionItemOrder.objects.bulk_create([
        CollectionItemOrder(
            collection=collection,
            media_type=media_type,
            object_id=object_id,
            position=position,
            caption=captions[position],
        )
        for position, (media_type, object_id) in enumerate(normalized_items)
    ])
    collection.save(update_fields=('updated_at',))


@transaction.atomic
def remove_collection_item(collection, media_type, object_id):
    collection = _lock_collection(collection)
    config = MEDIA_CONFIG.get(media_type)
    if config is None:
        raise CollectionInputError('Неизвестный тип контента.')

    try:
        object_id = int(object_id)
    except (TypeError, ValueError) as error:
        raise CollectionInputError('Некорректный идентификатор контента.') from error

    model, relation_name = config
    item = model.objects.filter(pk=object_id).first()
    relation = getattr(collection, relation_name)
    if item is None or not relation.filter(pk=object_id).exists():
        raise CollectionItemNotFoundError('Элемент не найден в подборке.')

    relation.remove(item)
    collection.item_orders.filter(
        media_type=media_type,
        object_id=object_id,
    ).delete()
    collection.save(update_fields=('updated_at',))


def _resolve_requested_content(items):
    if not isinstance(items, list):
        raise CollectionInputError('Список контента имеет неверный формат.')

    resolved_items = []
    seen_keys = set()
    for item_data in items:
        if not isinstance(item_data, dict) or item_data.get('media_type') not in MEDIA_CONFIG:
            raise CollectionInputError('Некорректный элемент подборки.')
        try:
            object_id = int(item_data.get('object_id'))
        except (TypeError, ValueError) as error:
            raise CollectionInputError('Некорректный элемент подборки.') from error

        media_type = item_data['media_type']
        item_key = (media_type, object_id)
        if item_key in seen_keys:
            raise CollectionInputError('Контент в подборке не должен повторяться.')

        model, relation_name = MEDIA_CONFIG[media_type]
        item = model.objects.filter(pk=object_id).first()
        if item is None:
            raise CollectionInputError('Один из элементов контента не найден.')

        seen_keys.add(item_key)
        resolved_items.append((media_type, object_id, relation_name, item))
    return resolved_items


def _sync_collection_item_orders(collection):
    existing_keys = set(
        collection.item_orders.values_list('media_type', 'object_id')
    )
    max_position = collection.item_orders.aggregate(max_position=Max('position'))['max_position']
    next_position = 0 if max_position is None else max_position + 1
    missing_orders = []
    for media_type, object_id in get_collection_content_keys(collection):
        if (media_type, object_id) not in existing_keys:
            missing_orders.append(CollectionItemOrder(
                collection=collection,
                media_type=media_type,
                object_id=object_id,
                position=next_position,
            ))
            next_position += 1
    if missing_orders:
        CollectionItemOrder.objects.bulk_create(missing_orders)


def _lock_collection(collection):
    return Collection.objects.select_for_update().get(pk=collection.pk)


def _validate_caption(value):
    if not isinstance(value, str) or len(value) > 2000:
        raise CollectionInputError('Подпись должна быть строкой длиной не более 2000 символов.')
    return value.strip()
