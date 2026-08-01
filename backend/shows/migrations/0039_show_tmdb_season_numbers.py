from django.db import migrations, models


def reset_show_details_cache(apps, schema_editor):
    Show = apps.get_model('shows', 'Show')
    Show.objects.update(tmdb_last_update=None)


class Migration(migrations.Migration):

    dependencies = [
        ('shows', '0038_add_show_creator_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='show',
            name='tmdb_season_numbers',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(reset_show_details_cache, migrations.RunPython.noop),
    ]
