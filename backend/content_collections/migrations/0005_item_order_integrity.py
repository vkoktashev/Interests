from django.db import migrations, models


def clean_and_normalize_item_orders(apps, schema_editor):
    CollectionItemOrder = apps.get_model('content_collections', 'CollectionItemOrder')
    media_models = {
        'game': apps.get_model('games', 'Game'),
        'movie': apps.get_model('movies', 'Movie'),
        'show': apps.get_model('shows', 'Show'),
    }

    CollectionItemOrder.objects.exclude(media_type__in=media_models).delete()
    for media_type, media_model in media_models.items():
        existing_ids = media_model.objects.values_list('id', flat=True)
        CollectionItemOrder.objects.filter(media_type=media_type) \
            .exclude(object_id__in=existing_ids).delete()

    collection_ids = CollectionItemOrder.objects.values_list(
        'collection_id',
        flat=True,
    ).distinct()
    for collection_id in collection_ids.iterator():
        orders = CollectionItemOrder.objects.filter(
            collection_id=collection_id,
        ).order_by('position', 'id')
        for position, item_order in enumerate(orders.iterator()):
            if item_order.position != position:
                item_order.position = position
                item_order.save(update_fields=('position',))


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('content_collections', '0004_collectionitemorder'),
    ]

    operations = [
        migrations.RunPython(
            clean_and_normalize_item_orders,
            migrations.RunPython.noop,
            atomic=True,
        ),
        migrations.AddConstraint(
            model_name='collectionitemorder',
            constraint=models.UniqueConstraint(
                fields=('collection', 'position'),
                name='unique_collection_item_position',
            ),
        ),
        migrations.AddConstraint(
            model_name='collectionitemorder',
            constraint=models.CheckConstraint(
                condition=models.Q(media_type__in=('game', 'movie', 'show')),
                name='valid_collection_item_media_type',
            ),
        ),
    ]
