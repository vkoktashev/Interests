from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0067_reset_hltb_last_attempt_without_hltb'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='igdb_game_type',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
