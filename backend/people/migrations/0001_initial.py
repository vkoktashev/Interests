from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('movies', '0025_movie_people'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql='ALTER TABLE movies_person RENAME TO people_person',
                    reverse_sql='ALTER TABLE people_person RENAME TO movies_person',
                ),
            ],
            state_operations=[
                migrations.CreateModel(
                    name='Person',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('tmdb_id', models.IntegerField(unique=True)),
                        ('name', models.CharField(max_length=200)),
                    ],
                    options={
                        'db_table': 'people_person',
                    },
                ),
            ],
        ),
    ]
