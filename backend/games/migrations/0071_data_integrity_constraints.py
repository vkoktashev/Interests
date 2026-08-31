from django.conf import settings
from django.db import migrations, models


def remove_duplicate_screenshots(apps, schema_editor):
    GameScreenshot = apps.get_model('games', 'GameScreenshot')
    _remove_duplicates(GameScreenshot, ('game_id', 'igdb_id'), {'igdb_id__isnull': False})
    _remove_duplicates(GameScreenshot, ('game_id', 'image'), {'image__gt': ''})


def _remove_duplicates(model, fields, filters):
    seen = set()
    duplicate_ids = []
    rows = model.objects.filter(**filters).order_by('id').values_list('id', *fields)
    for row in rows.iterator():
        row_id, key = row[0], row[1:]
        if key in seen:
            duplicate_ids.append(row_id)
        else:
            seen.add(key)
    if duplicate_ids:
        model.objects.filter(id__in=duplicate_ids).delete()


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('games', '0070_game_video'),
        ('videos', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunPython(
            remove_duplicate_screenshots,
            migrations.RunPython.noop,
            atomic=True,
        ),
        migrations.AddConstraint(
            model_name='game',
            constraint=models.UniqueConstraint(
                condition=models.Q(igdb_id__isnull=False),
                fields=('igdb_id',),
                name='unique_game_igdb_id',
            ),
        ),
        migrations.AddConstraint(
            model_name='game',
            constraint=models.UniqueConstraint(
                condition=~models.Q(igdb_slug=''),
                fields=('igdb_slug',),
                name='unique_game_igdb_slug',
            ),
        ),
        migrations.AddConstraint(
            model_name='gamebeattime',
            constraint=models.CheckConstraint(
                condition=models.Q(hours__gte=0),
                name='game_beat_time_hours_nonnegative',
            ),
        ),
        migrations.AddConstraint(
            model_name='gamescreenshot',
            constraint=models.UniqueConstraint(
                condition=models.Q(igdb_id__isnull=False),
                fields=('game', 'igdb_id'),
                name='unique_game_screenshot_igdb_id',
            ),
        ),
        migrations.AddConstraint(
            model_name='gamescreenshot',
            constraint=models.UniqueConstraint(
                condition=~models.Q(image=''),
                fields=('game', 'image'),
                name='unique_game_screenshot_image',
            ),
        ),
        migrations.AddConstraint(
            model_name='usergame',
            constraint=models.CheckConstraint(
                condition=models.Q(score__gte=0, score__lte=10),
                name='user_game_score_between_0_and_10',
            ),
        ),
        migrations.AddConstraint(
            model_name='usergame',
            constraint=models.CheckConstraint(
                condition=models.Q(spent_time__gte=0),
                name='user_game_spent_time_nonnegative',
            ),
        ),
    ]
