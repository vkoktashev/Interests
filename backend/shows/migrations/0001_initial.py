# Generated by Django 3.1.4 on 2020-12-08 20:08

from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Episode',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tmdb_season_number', models.IntegerField(unique=True)),
                ('tmdb_name', models.CharField(max_length=200)),
            ],
        ),
        migrations.CreateModel(
            name='Season',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tmdb_season_number', models.IntegerField(unique=True)),
                ('tmdb_name', models.CharField(max_length=200)),
            ],
        ),
        migrations.CreateModel(
            name='Show',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tmdb_id', models.IntegerField(unique=True)),
                ('tmdb_original_name', models.CharField(max_length=200)),
                ('tmdb_name', models.CharField(max_length=200)),
                ('tmdb_episode_run_time', models.IntegerField()),
            ],
        ),
        migrations.CreateModel(
            name='ShowLog',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(default=django.utils.timezone.now)),
                ('action_result', models.CharField(max_length=300)),
                ('action_type', models.CharField(choices=[('score', 'Score changed'), ('review', 'Review changed'), ('status', 'Status changed'), ('spent_time', 'Spent time changed')], max_length=30)),
                ('show', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='shows.show')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='SeasonLog',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(default=django.utils.timezone.now)),
                ('action_result', models.CharField(max_length=300)),
                ('action_type', models.CharField(choices=[('score', 'Score changed'), ('review', 'Review changed'), ('status', 'Status changed'), ('spent_time', 'Spent time changed')], max_length=30)),
                ('season', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='shows.season')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddField(
            model_name='season',
            name='tmdb_show',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='shows.show'),
        ),
        migrations.CreateModel(
            name='EpisodeLog',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created', models.DateTimeField(default=django.utils.timezone.now)),
                ('action_result', models.CharField(max_length=300)),
                ('action_type', models.CharField(choices=[('score', 'Score changed'), ('review', 'Review changed'), ('status', 'Status changed'), ('spent_time', 'Spent time changed')], max_length=30)),
                ('episode', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='shows.episode')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddField(
            model_name='episode',
            name='tmdb_season',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='shows.season'),
        ),
        migrations.CreateModel(
            name='UserShow',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('score', models.IntegerField(default=0, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(10)])),
                ('review', models.CharField(blank=True, max_length=300)),
                ('updated_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('status', models.CharField(choices=[('watched', 'Посмотрел'), ('stopped', 'Дропнул'), ('going', 'Буду смотреть'), ('not watched', 'Не смотрел')], default='not watched', max_length=30)),
                ('show', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='shows.show')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('user', 'show')},
            },
        ),
        migrations.CreateModel(
            name='UserSeason',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('score', models.IntegerField(default=0, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(10)])),
                ('review', models.CharField(blank=True, max_length=300)),
                ('updated_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('season', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='shows.season')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('user', 'season')},
            },
        ),
        migrations.CreateModel(
            name='UserEpisode',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('review', models.CharField(blank=True, max_length=300)),
                ('updated_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('score', models.IntegerField(default=-1, validators=[django.core.validators.MinValueValidator(-1), django.core.validators.MaxValueValidator(10)])),
                ('episode', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='shows.episode')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('user', 'episode')},
            },
        ),
    ]