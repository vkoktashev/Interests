from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0072_query_indexes'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='igdb_game_status',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
    ]
