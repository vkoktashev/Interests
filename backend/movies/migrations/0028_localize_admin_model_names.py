from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('movies', '0027_movie_tmdb_digital_release_date'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='movie',
            options={'verbose_name': 'фильм', 'verbose_name_plural': 'фильмы'},
        ),
        migrations.AlterModelOptions(
            name='usermovie',
            options={'verbose_name': 'фильм пользователя', 'verbose_name_plural': 'фильмы пользователей'},
        ),
        migrations.AlterModelOptions(
            name='movielog',
            options={'verbose_name': 'лог фильма', 'verbose_name_plural': 'логи фильмов'},
        ),
    ]
