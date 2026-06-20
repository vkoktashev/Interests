from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0063_gamebeattime_last_update'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='game',
            options={'verbose_name': 'игра', 'verbose_name_plural': 'игры'},
        ),
        migrations.AlterModelOptions(
            name='usergame',
            options={'verbose_name': 'игра пользователя', 'verbose_name_plural': 'игры пользователей'},
        ),
        migrations.AlterModelOptions(
            name='gamelog',
            options={'verbose_name': 'лог игры', 'verbose_name_plural': 'логи игр'},
        ),
        migrations.AlterModelOptions(
            name='gamedeveloper',
            options={'verbose_name': 'студия игры', 'verbose_name_plural': 'студии игр'},
        ),
    ]
