from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0046_alter_gamelog_game_alter_usergame_game'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='rawg_description',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='game',
            name='rawg_developers',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='game',
            name='rawg_last_update',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='rawg_metacritic',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='rawg_platforms',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='game',
            name='rawg_playtime',
            field=models.IntegerField(default=0),
        ),
    ]
