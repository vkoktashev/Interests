from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from users.models import UserFollow, UserLog


@receiver(pre_save, sender=UserFollow)
def capture_previous_follow_state(instance, **kwargs):
    instance._previous_is_following = UserFollow.objects.filter(
        user=instance.user,
        followed_user=instance.followed_user,
    ).values_list('is_following', flat=True).first()


@receiver(post_save, sender=UserFollow)
def create_follow_log(instance, created, **kwargs):
    previous = getattr(instance, '_previous_is_following', None)
    if created or previous != instance.is_following:
        UserLog.objects.create(
            user=instance.user,
            followed_user=instance.followed_user,
            action_type=UserLog.ACTION_TYPE_FOLLOW,
            action_result=instance.is_following,
        )
