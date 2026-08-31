from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('shows', '0044_data_integrity_constraints'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='usershow',
            index=models.Index(fields=['user', 'status'], name='ushow_user_status_idx'),
        ),
        migrations.AddIndex(
            model_name='usershow',
            index=models.Index(fields=['user', '-updated_at'], name='ushow_user_updated_idx'),
        ),
        migrations.AddIndex(
            model_name='userepisode',
            index=models.Index(fields=['user', 'score'], name='uepisode_user_score_idx'),
        ),
        migrations.AddIndex(
            model_name='showlog',
            index=models.Index(fields=['user', '-created'], name='shlog_user_created_idx'),
        ),
        migrations.AddIndex(
            model_name='showlog',
            index=models.Index(
                fields=['user', 'action_type', '-created'],
                name='shlog_user_type_created_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='seasonlog',
            index=models.Index(fields=['user', '-created'], name='selog_user_created_idx'),
        ),
        migrations.AddIndex(
            model_name='episodelog',
            index=models.Index(fields=['user', '-created'], name='eplog_user_created_idx'),
        ),
        migrations.AddIndex(
            model_name='episodelog',
            index=models.Index(
                fields=['user', 'action_type', '-created'],
                name='eplog_user_type_created_idx',
            ),
        ),
    ]
