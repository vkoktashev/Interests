from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0004_rename_rawg_id_to_igdb_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='person',
            name='tmdb_biography',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='person',
            name='tmdb_birthday',
            field=models.DateField(null=True),
        ),
        migrations.AddField(
            model_name='person',
            name='tmdb_deathday',
            field=models.DateField(null=True),
        ),
        migrations.AddField(
            model_name='person',
            name='tmdb_last_update',
            field=models.DateTimeField(null=True),
        ),
        migrations.AddField(
            model_name='person',
            name='tmdb_place_of_birth',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='person',
            name='tmdb_profile_path',
            field=models.CharField(blank=True, max_length=200),
        ),
    ]
