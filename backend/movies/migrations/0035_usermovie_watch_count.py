from django.db import migrations, models


def set_existing_watch_counts(apps, schema_editor):
    UserMovie = apps.get_model('movies', 'UserMovie')
    UserMovie.objects.filter(status='watched').update(watch_count=1)


class Migration(migrations.Migration):

    dependencies = [
        ('movies', '0034_query_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='usermovie',
            name='watch_count',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.RunPython(set_existing_watch_counts, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='usermovie',
            constraint=models.CheckConstraint(
                condition=~models.Q(status='watched') | models.Q(watch_count__gte=1),
                name='watched_movie_has_watch_count',
            ),
        ),
    ]
