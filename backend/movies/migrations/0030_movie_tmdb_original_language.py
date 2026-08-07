from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('movies', '0029_movie_english_fallback_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='movie',
            name='tmdb_original_language',
            field=models.CharField(blank=True, default='', max_length=12),
        ),
    ]
