from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0033_user_receive_show_status_changes'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='receive_people_releases',
            field=models.BooleanField(default=False),
        ),
    ]
