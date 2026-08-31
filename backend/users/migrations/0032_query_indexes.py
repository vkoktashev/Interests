from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0031_data_integrity_constraints'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='userlog',
            index=models.Index(fields=['user', '-created'], name='ulog_user_created_idx'),
        ),
        migrations.AddIndex(
            model_name='userfollow',
            index=models.Index(fields=['user', 'is_following'], name='ufollow_user_active_idx'),
        ),
    ]
