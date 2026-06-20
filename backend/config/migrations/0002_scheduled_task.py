from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


TASK_CODES = (
    'update_upcoming_games',
    'update_upcoming_movies',
    'update_shows',
    'send_release_emails',
)


def create_scheduled_tasks(apps, schema_editor):
    ScheduledTask = apps.get_model('config', 'ScheduledTask')
    for code in TASK_CODES:
        ScheduledTask.objects.get_or_create(code=code)


def delete_scheduled_tasks(apps, schema_editor):
    ScheduledTask = apps.get_model('config', 'ScheduledTask')
    ScheduledTask.objects.filter(code__in=TASK_CODES).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('config', 'create_trigram_extension'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ScheduledTask',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(
                    choices=[
                        ('update_upcoming_games', 'Обновление будущих игр'),
                        ('update_upcoming_movies', 'Обновление будущих фильмов'),
                        ('update_shows', 'Обновление сериалов'),
                        ('send_release_emails', 'Рассылка уведомлений о релизах'),
                    ],
                    max_length=64,
                    unique=True,
                )),
                ('last_manual_run_at', models.DateTimeField(blank=True, null=True)),
                ('last_task_id', models.CharField(blank=True, max_length=64)),
                ('last_manual_run_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='+',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'фоновая задача',
                'verbose_name_plural': 'фоновые задачи',
                'ordering': ('code',),
            },
        ),
        migrations.RunPython(create_scheduled_tasks, delete_scheduled_tasks),
    ]
