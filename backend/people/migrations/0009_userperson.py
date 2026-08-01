from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('people', '0008_alter_person_and_developer_options'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserPerson',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('person', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='tracked_by_users',
                    to='people.person',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='tracked_people',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'отслеживаемый человек',
                'verbose_name_plural': 'отслеживаемые люди',
                'db_table': 'people_user_person',
                'ordering': ('-created',),
                'unique_together': {('user', 'person')},
            },
        ),
    ]
