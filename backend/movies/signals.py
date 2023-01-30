from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.utils import timezone

from movies.models import UserMovie, MovieLog
from movies.serializers import UserMovieReadSerializer
from utils.functions import field_is_changed


@receiver(pre_save, sender=UserMovie)
def create_log(instance, **kwargs):
    try:
        old_instance = UserMovie.objects.get(user=instance.user, movie=instance.movie)
        old_fields = UserMovieReadSerializer(old_instance).data
    except UserMovie.DoesNotExist:
        old_fields = None

    fields = UserMovieReadSerializer(instance).data
    movie_log_dict = dict(MovieLog.ACTION_TYPE_CHOICES)

    for field in fields:
        if field_is_changed(movie_log_dict, field, fields, old_fields, UserMovie._meta):
            action_type = field
            action_result = fields[field]
            MovieLog.objects.create(user=instance.user, movie=instance.movie,
                                    action_type=action_type, action_result=action_result)


@receiver(pre_save, sender=UserMovie)
def update_datetime(instance, **kwargs):
    instance.updated_at = timezone.now()
