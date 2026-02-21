from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from users.models import UserLog, UserScore, UserLogAbstract


class Movie(models.Model):
    imdb_id = models.CharField(max_length=20, blank=True)
    tmdb_id = models.IntegerField(unique=True)
    tmdb_original_name = models.CharField(max_length=200)
    tmdb_name = models.CharField(max_length=200)
    tmdb_runtime = models.IntegerField(validators=[MinValueValidator(0)])
    tmdb_release_date = models.DateField(null=True)
    tmdb_backdrop_path = models.CharField(max_length=200, blank=True)
    tmdb_poster_path = models.CharField(max_length=200, blank=True)
    tmdb_overview = models.TextField(blank=True)
    tmdb_score = models.IntegerField(null=True)
    tmdb_tagline = models.TextField(blank=True)
    tmdb_production_companies = models.TextField(blank=True)
    tmdb_videos = models.JSONField(default=list, blank=True)
    tmdb_last_update = models.DateTimeField(null=True)


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

    movie = models.ForeignKey(Movie, on_delete=models.PROTECT)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_NOT_WATCHED)
    updated_at = models.DateTimeField(null=False, default=timezone.now)

    class Meta:
        unique_together = (("user", "movie"),)


class MovieLog(UserLogAbstract):
    movie = models.ForeignKey(Movie, on_delete=models.PROTECT)


class Genre(models.Model):
    tmdb_id = models.IntegerField(primary_key=True)
    tmdb_name = models.CharField(max_length=100)


class MovieGenre(models.Model):
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE)
    genre = models.ForeignKey(Genre, on_delete=models.CASCADE)

    class Meta:
        unique_together = (("movie", "genre"),)


class MoviePerson(models.Model):
    ROLE_ACTOR = 'actor'
    ROLE_DIRECTOR = 'director'
    ROLE_CHOICES = (
        (ROLE_ACTOR, 'Actor'),
        (ROLE_DIRECTOR, 'Director'),
    )

    movie = models.ForeignKey(Movie, on_delete=models.CASCADE)
    person = models.ForeignKey('people.Person', on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = (("movie", "person", "role"),)
