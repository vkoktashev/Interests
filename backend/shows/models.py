from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils import timezone

from users.models import UserScore, UserLogAbstract


class Show(models.Model):
    tmdb_id = models.IntegerField(unique=True, primary_key=True)
    tmdb_original_name = models.CharField(max_length=200)
    tmdb_name = models.CharField(max_length=200)
    tmdb_episode_run_time = models.IntegerField()
    tmdb_backdrop_path = models.CharField(max_length=200)


class Season(models.Model):
    tmdb_id = models.IntegerField(unique=True, primary_key=True)
    tmdb_season_number = models.IntegerField()
    tmdb_name = models.CharField(max_length=200)
    tmdb_show = models.ForeignKey(Show, on_delete=models.CASCADE)

    class Meta:
        unique_together = (("tmdb_season_number", "tmdb_show"),)


class Episode(models.Model):
    tmdb_id = models.IntegerField(unique=True, primary_key=True)
    tmdb_episode_number = models.IntegerField()
    tmdb_season_number = models.IntegerField()
    tmdb_name = models.CharField(max_length=200)
    tmdb_show = models.ForeignKey(Show, on_delete=models.CASCADE)

    class Meta:
        unique_together = (("tmdb_season_number", "tmdb_episode_number", "tmdb_show"),)


class UserShow(UserScore):
    STATUS_WATCHED = 'watched'
    STATUS_STOPPED = 'stopped'
    STATUS_GOING = 'going'
    STATUS_NOT_WATCHED = 'not watched'
    STATUS_WATCHING = 'watching'

    STATUS_CHOICES = (
        (STATUS_WATCHED, 'Посмотрел'),
        (STATUS_STOPPED, 'Дропнул'),
        (STATUS_GOING, 'Буду смотреть'),
        (STATUS_NOT_WATCHED, 'Не смотрел'),
        (STATUS_WATCHING, 'Смотрю')
    )

    show = models.ForeignKey(Show, on_delete=models.CASCADE)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_NOT_WATCHED)
    updated_at = models.DateTimeField(null=False, default=timezone.now)

    class Meta:
        unique_together = (("user", "show"),)


class UserSeason(UserScore):
    season = models.ForeignKey(Season, on_delete=models.CASCADE)

    class Meta:
        unique_together = (("user", "season"),)


class UserEpisode(UserScore):
    episode = models.ForeignKey(Episode, on_delete=models.CASCADE)
    score = models.IntegerField(validators=[MinValueValidator(-1), MaxValueValidator(10)], default=-1)

    class Meta:
        unique_together = (("user", "episode"),)


class ShowLog(UserLogAbstract):
    show = models.ForeignKey(Show, on_delete=models.CASCADE)


class SeasonLog(UserLogAbstract):
    season = models.ForeignKey(Season, on_delete=models.CASCADE)


class EpisodeLog(UserLogAbstract):
    episode = models.ForeignKey(Episode, on_delete=models.CASCADE)
