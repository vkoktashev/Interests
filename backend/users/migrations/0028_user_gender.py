from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0027_user_steam_account_region'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='gender',
            field=models.CharField(
                choices=[('male', 'Мужской'), ('female', 'Женский')],
                default='male',
                max_length=16,
            ),
        ),
    ]
