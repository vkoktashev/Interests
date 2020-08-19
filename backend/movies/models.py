from django.db import models

from users.models import UserLog, UserScore


class Movie(models.Model):
    imdb_id = models.IntegerField(unique=True)
    tmdb_id = models.IntegerField(unique=True)
    tmdb_original_name = models.CharField(max_length=200)
    tmdb_name = models.CharField(max_length=200)


class UserMovie(UserScore):
    STATUS_PLAYING = 'watching'
    STATUS_WATCHED = 'watched'
    STATUS_STOPPED = 'stopped'
    STATUS_GOING = 'going'
    STATUS_NOT_WATCHED = 'not watched'

    STATUS_CHOICES = (
        (STATUS_PLAYING, 'Watching'),
        (STATUS_WATCHED, 'Watched'),
        (STATUS_STOPPED, 'Stopped watching'),
        (STATUS_GOING, 'Going to watch'),
        (STATUS_NOT_WATCHED, 'Not watched')
    )

    movie = models.ForeignKey(Movie, on_delete=models.CASCADE)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES)

    class Meta:
        unique_together = (("user", "movie"),)


class MovieLog(UserLog):
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE)
