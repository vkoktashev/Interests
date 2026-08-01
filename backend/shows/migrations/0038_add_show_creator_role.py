from django.db import migrations, models


def reset_show_details_cache(apps, schema_editor):
    Show = apps.get_model('shows', 'Show')
    Show.objects.update(tmdb_last_update=None)


class Migration(migrations.Migration):

    dependencies = [
        ('shows', '0037_localize_admin_model_names'),
    ]

    operations = [
        migrations.AlterField(
            model_name='showperson',
            name='role',
            field=models.CharField(
                choices=[
                    ('actor', 'Actor'),
                    ('director', 'Director'),
                    ('creator', 'Creator'),
                ],
                max_length=20,
            ),
        ),
        migrations.RunPython(reset_show_details_cache, migrations.RunPython.noop),
    ]
