from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Developer',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rawg_id', models.IntegerField(unique=True)),
                ('name', models.CharField(max_length=200)),
            ],
            options={
                'db_table': 'people_developer',
            },
        ),
    ]
