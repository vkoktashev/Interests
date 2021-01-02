from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.utils import timezone

from shows.models import UserShow, ShowLog, UserSeason, SeasonLog, UserEpisode, EpisodeLog
from shows.serializers import UserShowSerializer, UserSeasonSerializer, UserEpisodeSerializer
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
        if field_is_changed(show_log_dict, field, fields, old_fields,
                            UserShow._meta.get_field('score').get_default()):
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
        if field_is_changed(season_log_dict, field, fields, old_fields,
                            UserSeason._meta.get_field('score').get_default()):
            action_type = field
            action_result = fields[field]
            SeasonLog.objects.create(user=instance.user, season=instance.season,
                                     action_type=action_type, action_result=action_result)


@receiver(pre_save, sender=UserEpisode)
def create_episode_log(instance, **kwargs):
    try:
        old_instance = UserEpisode.objects.get(user=instance.user, episode=instance.episode)
        old_fields = UserEpisodeSerializer(old_instance).data
    except UserEpisode.DoesNotExist:
        old_fields = None

    fields = UserEpisodeSerializer(instance).data
    episode_log_dict = dict(EpisodeLog.ACTION_TYPE_CHOICES)

    for field in fields:
        if field_is_changed(episode_log_dict, field, fields, old_fields,
                            UserEpisode._meta.get_field('score').get_default()):
            action_type = field
            action_result = fields[field]
            EpisodeLog.objects.create(user=instance.user, episode=instance.episode,
                                      action_type=action_type, action_result=action_result)


@receiver(pre_save, sender=UserShow)
def update_datetime_if_needed(instance, **kwargs):
    try:
        old_status = UserShow.objects.get(user=instance.user, show=instance.show).status
    except UserShow.DoesNotExist:
        old_status = None

    if instance.status != old_status and old_status == UserShow.STATUS_NOT_WATCHED:
        instance.updated_at = timezone.now()
