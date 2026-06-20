from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0007_person_tmdb_also_known_as'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='person',
            options={
                'verbose_name': 'человек',
                'verbose_name_plural': 'люди',
            },
        ),
        migrations.AlterModelOptions(
            name='developer',
            options={
                'verbose_name': 'игровая студия',
                'verbose_name_plural': 'игровые студии',
            },
        ),
    ]
