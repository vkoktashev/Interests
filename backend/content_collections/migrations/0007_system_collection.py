import django.db.models.deletion
from django.db import migrations, models


SYSTEM_KEY = 'kinopoisk-top-250'


def create_kinopoisk_top250_collection(apps, schema_editor):
    Collection = apps.get_model('content_collections', 'Collection')
    Collection.objects.get_or_create(
        system_key=SYSTEM_KEY,
        defaults={
            'author_id': None,
            'title': 'Топ 250 Кинопоиска',
            'display_mode': 'mixed',
            'privacy': 'public',
        },
    )


def delete_kinopoisk_top250_collection(apps, schema_editor):
    Collection = apps.get_model('content_collections', 'Collection')
    Collection.objects.filter(system_key=SYSTEM_KEY).delete()


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('content_collections', '0006_collection_subscribers'),
    ]

    operations = [
        migrations.AlterField(
            model_name='collection',
            name='author',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='collections',
                to='users.user',
            ),
        ),
        migrations.AddField(
            model_name='collection',
            name='system_key',
            field=models.CharField(blank=True, max_length=64, null=True, unique=True),
        ),
        migrations.RunPython(
            create_kinopoisk_top250_collection,
            delete_kinopoisk_top250_collection,
        ),
    ]
