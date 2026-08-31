from django.db import migrations, models


TASK_CODE = 'sync_kinopoisk_top250'


def create_sync_kinopoisk_top250_task(apps, schema_editor):
    ScheduledTask = apps.get_model('config', 'ScheduledTask')
    ScheduledTask.objects.get_or_create(code=TASK_CODE)


def delete_sync_kinopoisk_top250_task(apps, schema_editor):
    ScheduledTask = apps.get_model('config', 'ScheduledTask')
    ScheduledTask.objects.filter(code=TASK_CODE).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('config', '0003_sync_show_cast_task'),
    ]

    operations = [
        migrations.AlterField(
            model_name='scheduledtask',
            name='code',
            field=models.CharField(
                choices=[
                    ('update_upcoming_games', 'Обновление будущих игр'),
                    ('update_upcoming_movies', 'Обновление будущих фильмов'),
                    ('update_shows', 'Обновление сериалов'),
                    ('sync_show_cast', 'Синхронизация актеров сериалов'),
                    ('send_release_emails', 'Рассылка уведомлений о релизах'),
                    ('sync_kinopoisk_top250', 'Синхронизация Топ 250 Кинопоиска'),
                ],
                max_length=64,
                unique=True,
            ),
        ),
        migrations.RunPython(
            create_sync_kinopoisk_top250_task,
            delete_sync_kinopoisk_top250_task,
        ),
    ]
