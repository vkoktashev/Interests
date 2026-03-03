from django.db import migrations, models


def clear_legacy_stores(apps, schema_editor):
    GameStore = apps.get_model('games', 'GameStore')
    Store = apps.get_model('games', 'Store')
    GameStore.objects.all().delete()
    Store.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0058_remove_gametrailer_quality_fields'),
    ]

    operations = [
        migrations.RunPython(clear_legacy_stores, migrations.RunPython.noop),
        migrations.RenameField(
            model_name='store',
            old_name='rawg_id',
            new_name='igdb_id',
        ),
        migrations.RenameField(
            model_name='store',
            old_name='rawg_name',
            new_name='igdb_name',
        ),
        migrations.RenameField(
            model_name='store',
            old_name='rawg_slug',
            new_name='igdb_slug',
        ),
        migrations.AlterField(
            model_name='gamestore',
            name='url',
            field=models.URLField(blank=True, max_length=500),
        ),
    ]
