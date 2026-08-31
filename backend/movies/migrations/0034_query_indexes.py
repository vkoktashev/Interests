from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('movies', '0033_user_movie_score_constraint'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='usermovie',
            index=models.Index(fields=['user', 'status'], name='umovie_user_status_idx'),
        ),
        migrations.AddIndex(
            model_name='usermovie',
            index=models.Index(fields=['user', '-updated_at'], name='umovie_user_updated_idx'),
        ),
        migrations.AddIndex(
            model_name='movielog',
            index=models.Index(fields=['user', '-created'], name='mlog_user_created_idx'),
        ),
        migrations.AddIndex(
            model_name='movielog',
            index=models.Index(
                fields=['user', 'action_type', '-created'],
                name='mlog_user_type_created_idx',
            ),
        ),
    ]
