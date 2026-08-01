from django.db import migrations


def reset_hltb_last_attempt_without_hltb(apps, schema_editor):
    Game = apps.get_model('games', 'Game')
    GameBeatTime = apps.get_model('games', 'GameBeatTime')

    hltb_game_ids = GameBeatTime.objects.filter(source='hltb').values('game_id')
    Game.objects.exclude(id__in=hltb_game_ids).update(hltb_last_attempt=None)


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0066_game_hltb_last_attempt'),
    ]

    operations = [
        migrations.RunPython(reset_hltb_last_attempt_without_hltb, migrations.RunPython.noop),
    ]
