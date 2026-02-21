from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0001_initial'),
        ('shows', '0035_alter_episodelog_episode_alter_seasonlog_season_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='episode',
            name='tmdb_last_update',
            field=models.DateTimeField(null=True),
        ),
        migrations.AddField(
            model_name='episode',
            name='tmdb_overview',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='episode',
            name='tmdb_score',
            field=models.IntegerField(null=True),
        ),
        migrations.AddField(
            model_name='episode',
            name='tmdb_still_path',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='season',
            name='tmdb_air_date',
            field=models.DateField(null=True),
        ),
        migrations.AddField(
            model_name='season',
            name='tmdb_last_update',
            field=models.DateTimeField(null=True),
        ),
        migrations.AddField(
            model_name='season',
            name='tmdb_overview',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='season',
            name='tmdb_poster_path',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='show',
            name='tmdb_last_air_date',
            field=models.DateField(null=True),
        ),
        migrations.AddField(
            model_name='show',
            name='tmdb_last_update',
            field=models.DateTimeField(null=True),
        ),
        migrations.AddField(
            model_name='show',
            name='tmdb_number_of_seasons',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='show',
            name='tmdb_overview',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='show',
            name='tmdb_production_companies',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='show',
            name='tmdb_score',
            field=models.IntegerField(null=True),
        ),
        migrations.AddField(
            model_name='show',
            name='tmdb_videos',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.CreateModel(
            name='EpisodePerson',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('actor', 'Actor'), ('director', 'Director')], max_length=20)),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('episode', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='shows.episode')),
                ('person', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='people.person')),
            ],
            options={
                'unique_together': {('episode', 'person', 'role')},
            },
        ),
        migrations.CreateModel(
            name='SeasonPerson',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('actor', 'Actor'), ('director', 'Director')], max_length=20)),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('person', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='people.person')),
                ('season', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='shows.season')),
            ],
            options={
                'unique_together': {('season', 'person', 'role')},
            },
        ),
        migrations.CreateModel(
            name='ShowPerson',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('actor', 'Actor'), ('director', 'Director')], max_length=20)),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('person', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='people.person')),
                ('show', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='shows.show')),
            ],
            options={
                'unique_together': {('show', 'person', 'role')},
            },
        ),
    ]
