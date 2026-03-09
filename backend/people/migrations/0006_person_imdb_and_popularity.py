from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0005_person_details_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='person',
            name='imdb_id',
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name='person',
            name='tmdb_popularity',
            field=models.FloatField(null=True),
        ),
    ]
