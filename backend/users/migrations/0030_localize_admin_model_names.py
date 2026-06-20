from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0029_user_receive_movies_digital_releases'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='user',
            options={'verbose_name': 'пользователь', 'verbose_name_plural': 'пользователи'},
        ),
        migrations.AlterModelOptions(
            name='userlog',
            options={'verbose_name': 'лог подписки', 'verbose_name_plural': 'логи подписок'},
        ),
        migrations.AlterModelOptions(
            name='userfollow',
            options={'verbose_name': 'подписка', 'verbose_name_plural': 'подписки'},
        ),
        migrations.AlterModelOptions(
            name='userpasswordtoken',
            options={'verbose_name': 'токен сброса пароля', 'verbose_name_plural': 'токены сброса пароля'},
        ),
    ]
