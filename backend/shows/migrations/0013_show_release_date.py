# Generated by Django 3.1.5 on 2021-01-30 10:26

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shows', '0012_auto_20210130_1630'),
    ]

    operations = [
        migrations.AddField(
            model_name='show',
            name='release_date',
            field=models.DateTimeField(null=True),
        ),
    ]