from django.db import migrations, models
import django.db.models.deletion
from django.utils import timezone


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0024_alter_user_privacy'),
    ]

    operations = [
        migrations.CreateModel(
            name='LogReaction',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('log_type', models.CharField(choices=[('game', 'Game'), ('movie', 'Movie'), ('show', 'Show'),
                                                       ('season', 'Season'), ('episode', 'Episode'),
                                                       ('user', 'User')], max_length=30)),
                ('log_id', models.IntegerField()),
                ('reaction', models.CharField(choices=[('🌚', '🌚'), ('🤔', '🤔'), ('🤡', '🤡'), ('👀', '👀'),
                                                       ('😳', '😳'), ('👍', '👍'), ('😡', '😡'),
                                                       ('😁', '😁'), ('🤨', '🤨')], max_length=10)),
                ('created', models.DateTimeField(default=timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='users.user')),
            ],
            options={
                'unique_together': {('user', 'log_type', 'log_id')},
            },
        ),
    ]
