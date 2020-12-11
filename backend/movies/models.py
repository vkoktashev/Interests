from django.core.validators import MinValueValidator
from django.db import models

from users.models import UserLog, UserScore, UserLogAbstract


class Movie(models.Model):
    imdb_id = models.CharField(unique=True, max_length=20, null=True)
    tmdb_id = models.IntegerField(unique=True)
    tmdb_original_name = models.CharField(max_length=200)
    tmdb_name = models.CharField(max_length=200)
    tmdb_runtime = models.IntegerField(validators=[MinValueValidator(0)])


class UserMovie(UserScore):
    STATUS_WATCHED = 'watched'
    STATUS_STOPPED = 'stopped'
    STATUS_GOING = 'going'
    STATUS_NOT_WATCHED = 'not watched'

    STATUS_CHOICES = (
        (STATUS_WATCHED, 'Посмотрел'),
        (STATUS_STOPPED, 'Дропнул'),
        (STATUS_GOING, 'Буду смотреть'),
        (STATUS_NOT_WATCHED, 'Не смотрел')
    )

    movie = models.ForeignKey(Movie, on_delete=models.CASCADE)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_NOT_WATCHED)

    class Meta:
        unique_together = (("user", "movie"),)


class MovieLog(UserLogAbstract):
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE)
