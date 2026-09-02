from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from users.models import UserScore, UserLogAbstract


class Movie(models.Model):
    imdb_id = models.CharField(max_length=20, blank=True)
    tmdb_id = models.IntegerField(unique=True)
    tmdb_original_name = models.CharField(max_length=200)
    tmdb_name = models.CharField(max_length=200)
    tmdb_name_en = models.CharField(max_length=200, blank=True, default='')
    tmdb_original_language = models.CharField(max_length=12, blank=True, default='')
    tmdb_runtime = models.IntegerField(validators=[MinValueValidator(0)])
    tmdb_release_date = models.DateField(null=True)
    tmdb_digital_release_date = models.DateField(null=True)
    tmdb_backdrop_path = models.CharField(max_length=200, blank=True)
    tmdb_poster_path = models.CharField(max_length=200, blank=True)
    tmdb_overview = models.TextField(blank=True)
    tmdb_overview_en = models.TextField(blank=True, default='')
    tmdb_score = models.IntegerField(null=True)
    tmdb_tagline = models.TextField(blank=True)
    tmdb_production_companies = models.TextField(blank=True)
    tmdb_last_update = models.DateTimeField(null=True)
    videos = models.ManyToManyField('videos.Video', through='MovieVideo', related_name='movies')

    def __str__(self):
        return self.tmdb_name or self.tmdb_original_name or f'Movie #{self.tmdb_id}'

    class Meta:
        verbose_name = 'фильм'
        verbose_name_plural = 'фильмы'


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
    watch_count = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(null=False, default=timezone.now)

    class Meta:
        unique_together = (("user", "movie"),)
        indexes = (
            models.Index(fields=('user', 'status'), name='umovie_user_status_idx'),
            models.Index(fields=('user', '-updated_at'), name='umovie_user_updated_idx'),
        )
        constraints = (
            models.CheckConstraint(
                condition=models.Q(score__gte=0, score__lte=10),
                name='user_movie_score_between_0_and_10',
            ),
            models.CheckConstraint(
                condition=~models.Q(status='watched') | models.Q(watch_count__gte=1),
                name='watched_movie_has_watch_count',
            ),
        )
        verbose_name = 'фильм пользователя'
        verbose_name_plural = 'фильмы пользователей'


class MovieLog(UserLogAbstract):
    movie = models.ForeignKey(Movie, on_delete=models.PROTECT)

    class Meta:
        indexes = (
            models.Index(fields=('user', '-created'), name='mlog_user_created_idx'),
            models.Index(
                fields=('user', 'action_type', '-created'),
                name='mlog_user_type_created_idx',
            ),
        )
        verbose_name = 'лог фильма'
        verbose_name_plural = 'логи фильмов'


class Genre(models.Model):
    tmdb_id = models.IntegerField(primary_key=True)
    tmdb_name = models.CharField(max_length=100)


class MovieGenre(models.Model):
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE)
    genre = models.ForeignKey(Genre, on_delete=models.CASCADE)

    class Meta:
        unique_together = (("movie", "genre"),)


class MovieVideo(models.Model):
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE)
    video = models.ForeignKey('videos.Video', on_delete=models.CASCADE)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = (('movie', 'video'),)
        ordering = ('sort_order', 'id')
        verbose_name = 'видео фильма'
        verbose_name_plural = 'видео фильмов'


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
    character = models.CharField(max_length=500, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = (("movie", "person", "role"),)
