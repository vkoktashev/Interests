from django.db import migrations, models


def invalidate_movie_people(apps, schema_editor):
    Movie = apps.get_model('movies', 'Movie')
    Movie.objects.update(tmdb_last_update=None)


class Migration(migrations.Migration):

    dependencies = [
        ('movies', '0031_movie_video'),
    ]

    operations = [
        migrations.AddField(
            model_name='movieperson',
            name='character',
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.RunPython(invalidate_movie_people, migrations.RunPython.noop),
    ]
