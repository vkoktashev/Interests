# Generated by Django 3.1.6 on 2021-02-13 09:06

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('shows', '0022_auto_20210213_1605'),
    ]

    operations = [
        migrations.RenameField(
            model_name='usershow',
            old_name='fake_show',
            new_name='fake_tmdb_show',
        ),
    ]