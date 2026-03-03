from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0055_game_igdb_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='igdb_aggregated_rating',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='igdb_aggregated_rating_count',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='igdb_cover_url',
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name='game',
            name='igdb_last_update',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='igdb_platforms',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='game',
            name='igdb_rating',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='igdb_rating_count',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='igdb_release_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='igdb_screenshots_count',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='igdb_summary',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='game',
            name='igdb_url',
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name='game',
            name='igdb_videos_count',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
