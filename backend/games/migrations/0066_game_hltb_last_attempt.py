from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0065_game_igdb_release_date_precision'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='hltb_last_attempt',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
