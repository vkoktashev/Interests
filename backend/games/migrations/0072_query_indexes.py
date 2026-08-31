from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0071_data_integrity_constraints'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='usergame',
            index=models.Index(fields=['user', 'status'], name='ugame_user_status_idx'),
        ),
        migrations.AddIndex(
            model_name='usergame',
            index=models.Index(fields=['user', '-updated_at'], name='ugame_user_updated_idx'),
        ),
        migrations.AddIndex(
            model_name='gamelog',
            index=models.Index(fields=['user', '-created'], name='glog_user_created_idx'),
        ),
        migrations.AddIndex(
            model_name='gamelog',
            index=models.Index(
                fields=['user', 'action_type', '-created'],
                name='glog_user_type_created_idx',
            ),
        ),
    ]
