from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shows', '0040_show_english_fallback_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='show',
            name='tmdb_original_language',
            field=models.CharField(blank=True, default='', max_length=12),
        ),
    ]
