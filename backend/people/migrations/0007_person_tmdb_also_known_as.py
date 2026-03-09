from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0006_person_imdb_and_popularity'),
    ]

    operations = [
        migrations.AddField(
            model_name='person',
            name='tmdb_also_known_as',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
