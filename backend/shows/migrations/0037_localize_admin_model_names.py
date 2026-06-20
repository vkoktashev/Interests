from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('shows', '0036_show_details_people_cache'),
    ]

    operations = [
        migrations.AlterModelOptions(name='show', options={'verbose_name': 'сериал', 'verbose_name_plural': 'сериалы'}),
        migrations.AlterModelOptions(name='season', options={'verbose_name': 'сезон', 'verbose_name_plural': 'сезоны'}),
        migrations.AlterModelOptions(name='episode', options={'verbose_name': 'серия', 'verbose_name_plural': 'серии'}),
        migrations.AlterModelOptions(
            name='usershow',
            options={'verbose_name': 'сериал пользователя', 'verbose_name_plural': 'сериалы пользователей'},
        ),
        migrations.AlterModelOptions(
            name='userseason',
            options={'verbose_name': 'сезон пользователя', 'verbose_name_plural': 'сезоны пользователей'},
        ),
        migrations.AlterModelOptions(
            name='userepisode',
            options={'verbose_name': 'серия пользователя', 'verbose_name_plural': 'серии пользователей'},
        ),
        migrations.AlterModelOptions(
            name='showlog',
            options={'verbose_name': 'лог сериала', 'verbose_name_plural': 'логи сериалов'},
        ),
        migrations.AlterModelOptions(
            name='seasonlog',
            options={'verbose_name': 'лог сезона', 'verbose_name_plural': 'логи сезонов'},
        ),
        migrations.AlterModelOptions(
            name='episodelog',
            options={'verbose_name': 'лог серии', 'verbose_name_plural': 'логи серий'},
        ),
    ]
