# Generated by Django 3.2 on 2021-04-13 08:45

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0022_user_backdrop_path'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='privacy',
            field=models.CharField(choices=[('nobody', 'Nobody can see profile'), ('all', 'Everyone can see profile'), ('followed', 'Followed can see profile')], default='all', max_length=50),
        ),
    ]
