from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('movies', '0028_localize_admin_model_names'),
    ]

    operations = [
        migrations.AddField(
            model_name='movie',
            name='tmdb_name_en',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='movie',
            name='tmdb_overview_en',
            field=models.TextField(blank=True, default=''),
        ),
    ]
