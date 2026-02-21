from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('movies', '0023_alter_movielog_movie_alter_usermovie_movie'),
    ]

    operations = [
        migrations.AddField(
            model_name='movie',
            name='tmdb_cast',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='movie',
            name='tmdb_directors',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='movie',
            name='tmdb_last_update',
            field=models.DateTimeField(null=True),
        ),
        migrations.AddField(
            model_name='movie',
            name='tmdb_overview',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='movie',
            name='tmdb_production_companies',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='movie',
            name='tmdb_score',
            field=models.IntegerField(null=True),
        ),
        migrations.AddField(
            model_name='movie',
            name='tmdb_tagline',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='movie',
            name='tmdb_videos',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
