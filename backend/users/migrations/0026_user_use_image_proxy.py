from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0025_user_google_sub_google_email'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='use_image_proxy',
            field=models.BooleanField(default=True),
        ),
    ]
