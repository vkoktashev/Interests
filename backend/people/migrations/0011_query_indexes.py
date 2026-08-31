from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0010_personlog'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='personlog',
            index=models.Index(fields=['user', '-created'], name='plog_user_created_idx'),
        ),
    ]
