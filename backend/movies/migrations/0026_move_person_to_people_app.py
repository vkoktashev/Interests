from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0001_initial'),
        ('movies', '0025_movie_people'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AlterField(
                    model_name='movieperson',
                    name='person',
                    field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='people.person'),
                ),
                migrations.DeleteModel(
                    name='Person',
                ),
            ],
        ),
    ]
