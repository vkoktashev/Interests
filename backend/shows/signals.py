from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.utils import timezone

from shows.models import UserShow, ShowLog
from shows.serializers import UserShowSerializer
from utils.functions import field_is_changed


@receiver(pre_save, sender=UserShow)
def create_show_log(instance, **kwargs):
    try:
        old_instance = UserShow.objects.get(user=instance.user, show=instance.show)
        old_fields = UserShowSerializer(old_instance).data
    except UserShow.DoesNotExist:
        old_fields = None

    fields = UserShowSerializer(instance).data
    show_log_dict = dict(ShowLog.ACTION_TYPE_CHOICES)

    for field in fields:
        if field_is_changed(show_log_dict, field, fields, old_fields, UserShow._meta.get_field('score').get_default()):
            action_type = field
            action_result = fields[field]
            ShowLog.objects.create(user=instance.user, show=instance.show,
                                   action_type=action_type, action_result=action_result)


@receiver(pre_save, sender=UserShow)
def update_datetime_if_needed(instance, **kwargs):
    try:
        old_status = UserShow.objects.get(user=instance.user, show=instance.show).status
    except UserShow.DoesNotExist:
        old_status = None

    if instance.status != old_status and old_status == UserShow.STATUS_NOT_WATCHED:
        instance.updated_at = timezone.now()
