# Generated by Django 4.1.3 on 2022-12-08 13:34

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('shows', '0033_episode_tmdb_run_time'),
    ]

    operations = [
        migrations.RenameField(
            model_name='episode',
            old_name='tmdb_run_time',
            new_name='tmdb_runtime',
        ),
        migrations.RenameField(
            model_name='show',
            old_name='tmdb_episode_run_time',
            new_name='tmdb_episode_runtime',
        ),
    ]
