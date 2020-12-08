from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.utils import timezone

from movies.models import UserMovie, MovieLog
from movies.serializers import UserMovieSerializer
from utils.functions import field_is_changed


@receiver(pre_save, sender=UserMovie)
def create_log(instance, **kwargs):
    try:
        old_instance = UserMovie.objects.get(user=instance.user, movie=instance.movie)
        old_fields = UserMovieSerializer(old_instance).data
    except UserMovie.DoesNotExist:
        old_fields = None

    fields = UserMovieSerializer(instance).data
    movie_log_dict = dict(MovieLog.ACTION_TYPE_CHOICES)

    for field in fields:
        if field_is_changed(movie_log_dict, field, fields, old_fields, UserMovie._meta.get_field('score').get_default()):
            action_type = field
            action_result = fields[field]
            MovieLog.objects.create(user=instance.user, movie=instance.movie,
                                    action_type=action_type, action_result=action_result)


@receiver(pre_save, sender=UserMovie)
def update_datetime_if_needed(instance, **kwargs):
    try:
        old_status = UserMovie.objects.get(user=instance.user, movie=instance.movie).status
    except UserMovie.DoesNotExist:
        old_status = None

    if instance.status != old_status and old_status == UserMovie.STATUS_NOT_WATCHED:
        instance.updated_at = timezone.now()
