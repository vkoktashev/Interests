from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.utils import timezone

from games.models import UserGame, GameLog
from games.serializers import UserGameSerializer
from utils.functions import field_is_changed


@receiver(pre_save, sender=UserGame)
async def create_log(instance, **kwargs):
    try:
        old_instance = await UserGame.objects.aget(user=instance.user, game=instance.game)
        old_fields = UserGameSerializer(old_instance).data
    except UserGame.DoesNotExist:
        old_fields = None

    fields = UserGameSerializer(instance).data
    game_log_dict = dict(GameLog.ACTION_TYPE_CHOICES)

    for field in fields:
        if field_is_changed(game_log_dict, field, fields, old_fields, UserGame._meta):
            action_type = field
            action_result = fields[field]
            await GameLog.objects.acreate(user=instance.user, game=instance.game,
                                          action_type=action_type, action_result=action_result)


@receiver(pre_save, sender=UserGame)
def update_datetime(instance, **kwargs):
    instance.updated_at = timezone.now()
