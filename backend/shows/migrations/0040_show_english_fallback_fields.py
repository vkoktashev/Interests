from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shows', '0039_show_tmdb_season_numbers'),
    ]

    operations = [
        migrations.AddField(
            model_name='show',
            name='tmdb_name_en',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='show',
            name='tmdb_overview_en',
            field=models.TextField(blank=True, default=''),
        ),
    ]
