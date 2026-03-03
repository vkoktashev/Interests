from django.db import migrations, models


def clear_legacy_related_data(apps, schema_editor):
    GameGenre = apps.get_model('games', 'GameGenre')
    Genre = apps.get_model('games', 'Genre')
    GameTrailer = apps.get_model('games', 'GameTrailer')
    GameScreenshot = apps.get_model('games', 'GameScreenshot')
    GameDeveloper = apps.get_model('games', 'GameDeveloper')
    Developer = apps.get_model('people', 'Developer')
    Game = apps.get_model('games', 'Game')

    GameGenre.objects.all().delete()
    GameTrailer.objects.all().delete()
    GameScreenshot.objects.all().delete()
    GameDeveloper.objects.all().delete()
    Genre.objects.all().delete()
    Developer.objects.all().delete()

    Game.objects.all().update(
        igdb_videos_count=None,
        igdb_screenshots_count=None,
        rawg_movies_count=None,
        rawg_screenshots_count=None,
    )


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0004_rename_rawg_id_to_igdb_id'),
        ('games', '0056_game_igdb_detail_fields'),
    ]

    operations = [
        migrations.RenameField(
            model_name='genre',
            old_name='rawg_id',
            new_name='igdb_id',
        ),
        migrations.RenameField(
            model_name='genre',
            old_name='rawg_name',
            new_name='igdb_name',
        ),
        migrations.RenameField(
            model_name='genre',
            old_name='rawg_slug',
            new_name='igdb_slug',
        ),
        migrations.AlterField(
            model_name='genre',
            name='igdb_slug',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.RenameField(
            model_name='gametrailer',
            old_name='rawg_id',
            new_name='igdb_id',
        ),
        migrations.AddField(
            model_name='gametrailer',
            name='igdb_video_id',
            field=models.CharField(blank=True, default='', max_length=100),
            preserve_default=False,
        ),
        migrations.RenameField(
            model_name='gamescreenshot',
            old_name='rawg_id',
            new_name='igdb_id',
        ),
        migrations.RunPython(clear_legacy_related_data, migrations.RunPython.noop),
    ]
