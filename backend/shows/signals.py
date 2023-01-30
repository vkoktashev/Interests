from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.utils import timezone

from shows.models import UserShow, ShowLog, UserSeason, SeasonLog
from shows.serializers import UserShowReadSerializer, UserSeasonSerializer
from utils.functions import field_is_changed


@receiver(pre_save, sender=UserShow)
def create_show_log(instance, **kwargs):
    try:
        old_instance = UserShow.objects.get(user=instance.user, show=instance.show)
        old_fields = UserShowReadSerializer(old_instance).data
    except UserShow.DoesNotExist:
        old_fields = None

    fields = UserShowReadSerializer(instance).data
    show_log_dict = dict(ShowLog.ACTION_TYPE_CHOICES)

    for field in fields:
        if field_is_changed(show_log_dict, field, fields, old_fields, UserShow._meta):
            action_type = field
            action_result = fields[field]
            ShowLog.objects.create(user=instance.user, show=instance.show,
                                   action_type=action_type, action_result=action_result)


@receiver(pre_save, sender=UserSeason)
def create_season_log(instance, **kwargs):
    try:
        old_instance = UserSeason.objects.get(user=instance.user, season=instance.season)
        old_fields = UserSeasonSerializer(old_instance).data
    except UserSeason.DoesNotExist:
        old_fields = None

    fields = UserSeasonSerializer(instance).data
    season_log_dict = dict(SeasonLog.ACTION_TYPE_CHOICES)

    for field in fields:
        if field_is_changed(season_log_dict, field, fields, old_fields, UserSeason._meta):
            action_type = field
            action_result = fields[field]
            SeasonLog.objects.create(user=instance.user, season=instance.season,
                                     action_type=action_type, action_result=action_result)


@receiver(pre_save, sender=UserShow)
def update_datetime(instance, **kwargs):
    instance.updated_at = timezone.now()
