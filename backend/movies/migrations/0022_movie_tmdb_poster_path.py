# Generated by Django 3.2 on 2021-04-21 12:10

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('movies', '0021_auto_20210222_1848'),
    ]

    operations = [
        migrations.AddField(
            model_name='movie',
            name='tmdb_poster_path',
            field=models.CharField(blank=True, max_length=200),
        ),
    ]