from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
        ('users', '0034_user_receive_people_releases'),
    ]

    operations = [
        migrations.CreateModel(
            name='LogReaction',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('object_id', models.PositiveBigIntegerField()),
                ('emoji', models.CharField(
                    choices=[
                        ('👍', 'Нравится'), ('❤️', 'Любовь'), ('🔥', 'Огонь'), ('😂', 'Смешно'),
                        ('😮', 'Удивление'), ('😢', 'Грусть'), ('👏', 'Аплодисменты'), ('🤔', 'Задумался'),
                    ],
                    max_length=8,
                )),
                ('content_type', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    to='contenttypes.contenttype',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='log_reactions',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'реакция на лог',
                'verbose_name_plural': 'реакции на логи',
                'constraints': [
                    models.UniqueConstraint(
                        fields=('content_type', 'object_id', 'user'),
                        name='unique_user_log_reaction',
                    ),
                    models.CheckConstraint(
                        condition=models.Q(emoji__in=('👍', '❤️', '🔥', '😂', '😮', '😢', '👏', '🤔')),
                        name='valid_log_reaction_emoji',
                    ),
                ],
            },
        ),
    ]
