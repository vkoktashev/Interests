from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('movies', '0026_move_person_to_people_app'),
    ]

    operations = [
        migrations.AddField(
            model_name='movie',
            name='tmdb_digital_release_date',
            field=models.DateField(null=True),
        ),
    ]
