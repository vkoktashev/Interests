from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0028_user_gender'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='receive_movies_digital_releases',
            field=models.BooleanField(default=False),
        ),
    ]
