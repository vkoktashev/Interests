from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('people', '0009_userperson'),
    ]

    operations = [
        migrations.CreateModel(
            name='PersonLog',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(default=django.utils.timezone.now)),
                ('action_result', models.CharField(max_length=5)),
                ('action_type', models.CharField(
                    choices=[('is_tracking', 'Tracking status changed')],
                    max_length=30,
                )),
                ('person', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    to='people.person',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'лог отслеживания человека',
                'verbose_name_plural': 'логи отслеживания людей',
            },
        ),
    ]
