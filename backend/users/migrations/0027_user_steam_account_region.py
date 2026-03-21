from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0026_user_use_image_proxy'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='steam_account_region',
            field=models.CharField(
                choices=[('ru', 'Россия'), ('kz', 'Казахстан')],
                default='ru',
                max_length=8,
            ),
        ),
    ]
