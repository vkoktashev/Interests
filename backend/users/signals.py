from django.db.models.signals import pre_save
from django.dispatch import receiver

from movies.models import UserLog
from users.models import UserFollow
from users.serializers import UserFollowSerializer


@receiver(pre_save, sender=UserFollow)
def create_log(instance, **kwargs):
    try:
        old_instance = UserFollow.objects.get(user=instance.user, followed_user=instance.followed_user)
        old_fields = UserFollowSerializer(old_instance).data
    except UserFollow.DoesNotExist:
        old_fields = None

    fields = UserFollowSerializer(instance).data
    user_log_dict = dict(UserLog.ACTION_TYPE_CHOICES)

    for field in fields:
        if field in user_log_dict and (not old_fields or fields[field] != old_fields[field]):
            action_type = field
            action_result = fields[field]
            UserLog.objects.create(user=instance.user, followed_user=instance.followed_user,
                                   action_type=action_type, action_result=action_result)
