from django.db.models.signals import pre_save
from django.dispatch import receiver

from games.models import UserGame, GameLog
from games.serializers import UserGameSerializer


@receiver(pre_save, sender=UserGame)
def create_log(instance, **kwargs):
    try:
        old_instance = UserGame.objects.get(user=instance.user, game=instance.game)
        old_fields = UserGameSerializer(old_instance).data
    except UserGame.DoesNotExist:
        old_fields = None

    fields = UserGameSerializer(instance).data
    game_log_dict = dict(GameLog.ACTION_TYPE_CHOICES)

    for field in fields:
        if field in game_log_dict and (not old_fields or fields[field] != old_fields[field]):
            action_type = field
            action_result = fields[field]
            GameLog.objects.create(user=instance.user, game=instance.game,
                                   action_type=action_type, action_result=action_result)
