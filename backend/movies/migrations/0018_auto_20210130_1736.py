# Generated by Django 3.1.5 on 2021-01-30 10:36

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('movies', '0017_movie_release_date'),
    ]

    operations = [
        migrations.RenameField(
            model_name='movie',
            old_name='release_date',
            new_name='tmdb_release_date',
        ),
    ]