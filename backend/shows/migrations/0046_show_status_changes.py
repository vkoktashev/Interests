import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shows', '0045_query_indexes'),
    ]

    operations = [
        migrations.CreateModel(
            name='ShowChangesSyncState',
            fields=[
                ('source', models.CharField(max_length=20, primary_key=True, serialize=False)),
                ('last_successful_date', models.DateField(blank=True, null=True)),
            ],
            options={
                'verbose_name': 'состояние синхронизации изменений сериалов',
                'verbose_name_plural': 'состояния синхронизации изменений сериалов',
            },
        ),
        migrations.CreateModel(
            name='ShowStatusChange',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('old_status', models.CharField(choices=[('Ended', 'Завершился'), ('Returning Series', 'Продолжается'), ('Pilot', 'Пилот'), ('Canceled', 'Отменен'), ('In Production', 'В производстве'), ('Planned', 'Планируется')], max_length=30)),
                ('new_status', models.CharField(choices=[('Ended', 'Завершился'), ('Returning Series', 'Продолжается'), ('Pilot', 'Пилот'), ('Canceled', 'Отменен'), ('In Production', 'В производстве'), ('Planned', 'Планируется')], max_length=30)),
                ('detected_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('emailed_at', models.DateTimeField(blank=True, null=True)),
                ('show', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='shows.show')),
            ],
            options={
                'verbose_name': 'изменение статуса сериала',
                'verbose_name_plural': 'изменения статуса сериалов',
                'ordering': ('detected_at', 'id'),
                'indexes': [models.Index(fields=['emailed_at', 'detected_at'], name='show_status_email_idx')],
            },
        ),
    ]
