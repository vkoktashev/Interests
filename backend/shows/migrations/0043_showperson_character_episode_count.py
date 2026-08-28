from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shows', '0042_media_videos'),
    ]

    operations = [
        migrations.AddField(
            model_name='showperson',
            name='character',
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name='showperson',
            name='episode_count',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
