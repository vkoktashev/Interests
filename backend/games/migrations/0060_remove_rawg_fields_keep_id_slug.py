from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0059_store_to_igdb'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='game',
            name='rawg_name',
        ),
        migrations.RemoveField(
            model_name='game',
            name='rawg_release_date',
        ),
        migrations.RemoveField(
            model_name='game',
            name='rawg_tba',
        ),
        migrations.RemoveField(
            model_name='game',
            name='rawg_backdrop_path',
        ),
        migrations.RemoveField(
            model_name='game',
            name='rawg_poster_path',
        ),
        migrations.RemoveField(
            model_name='game',
            name='rawg_description',
        ),
        migrations.RemoveField(
            model_name='game',
            name='rawg_metacritic',
        ),
        migrations.RemoveField(
            model_name='game',
            name='rawg_platforms',
        ),
        migrations.RemoveField(
            model_name='game',
            name='rawg_playtime',
        ),
        migrations.RemoveField(
            model_name='game',
            name='rawg_movies_count',
        ),
        migrations.RemoveField(
            model_name='game',
            name='rawg_screenshots_count',
        ),
        migrations.RemoveField(
            model_name='game',
            name='rawg_last_update',
        ),
    ]
