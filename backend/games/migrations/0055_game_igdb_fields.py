from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0054_game_screenshot_table'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='igdb_id',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='igdb_name',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='game',
            name='igdb_slug',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='game',
            name='igdb_year',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
