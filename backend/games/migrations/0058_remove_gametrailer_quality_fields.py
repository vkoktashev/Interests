from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0057_related_models_to_igdb'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='gametrailer',
            name='preview',
        ),
        migrations.RemoveField(
            model_name='gametrailer',
            name='video_max',
        ),
        migrations.RemoveField(
            model_name='gametrailer',
            name='video_480',
        ),
        migrations.RemoveField(
            model_name='gametrailer',
            name='video_320',
        ),
    ]
