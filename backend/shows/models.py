from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.db.models import UniqueConstraint, Deferrable
from django.utils import timezone

from movies.models import Genre
from people.models import Person
from users.models import UserScore, UserLogAbstract


class Show(models.Model):
    TMDB_STATUS_ENDED = 'Ended'
    TMDB_STATUS_RETURNING_SERIES = 'Returning Series'
    TMDB_STATUS_PILOT = 'Pilot'
    TMDB_STATUS_CANCELED = 'Canceled'
    TMDB_STATUS_IN_PRODUCTION = 'In Production'
    TMDB_STATUS_PLANNED = 'Planned'

    TMDB_STATUS_CHOICES = (
        (TMDB_STATUS_ENDED, 'Завершился'),
        (TMDB_STATUS_RETURNING_SERIES, 'Продолжается'),
        (TMDB_STATUS_PILOT, 'Пилот'),
        (TMDB_STATUS_CANCELED, 'Отменен'),
        (TMDB_STATUS_IN_PRODUCTION, 'В производстве'),
        (TMDB_STATUS_PLANNED, 'Планируется')
    )

    imdb_id = models.CharField(max_length=20, blank=True)
    tmdb_id = models.IntegerField(unique=True)
    tmdb_original_name = models.CharField(max_length=200)
    tmdb_name = models.CharField(max_length=200)
    tmdb_episode_runtime = models.IntegerField()
    tmdb_backdrop_path = models.CharField(max_length=200, blank=True)
    tmdb_poster_path = models.CharField(max_length=200, blank=True)
    tmdb_release_date = models.DateField(null=True)
    tmdb_status = models.CharField(max_length=30, blank=True, choices=TMDB_STATUS_CHOICES)
    tmdb_number_of_episodes = models.IntegerField(default=0)
    tmdb_number_of_seasons = models.IntegerField(default=0)
    tmdb_last_air_date = models.DateField(null=True)
    tmdb_overview = models.TextField(blank=True)
    tmdb_score = models.IntegerField(null=True)
    tmdb_production_companies = models.TextField(blank=True)
    tmdb_videos = models.JSONField(default=list, blank=True)
    tmdb_last_update = models.DateTimeField(null=True)


class Season(models.Model):
    tmdb_id = models.IntegerField(unique=True)
    tmdb_season_number = models.IntegerField()
    tmdb_name = models.CharField(max_length=200)
    tmdb_show = models.ForeignKey(Show, on_delete=models.CASCADE)
    tmdb_overview = models.TextField(blank=True)
    tmdb_poster_path = models.CharField(max_length=200, blank=True)
    tmdb_air_date = models.DateField(null=True)
    tmdb_last_update = models.DateTimeField(null=True)

    class Meta:
        unique_together = (("tmdb_season_number", "tmdb_show"),)


class Episode(models.Model):
    tmdb_id = models.IntegerField(unique=True)
    tmdb_episode_number = models.IntegerField()
    tmdb_season = models.ForeignKey(Season, on_delete=models.CASCADE)
    tmdb_name = models.CharField(max_length=200)
    tmdb_release_date = models.DateField(null=True)
    tmdb_runtime = models.IntegerField(default=0)
    tmdb_overview = models.TextField(blank=True)
    tmdb_score = models.IntegerField(null=True)
    tmdb_still_path = models.CharField(max_length=200, blank=True)
    tmdb_last_update = models.DateTimeField(null=True)

    class Meta:
        UniqueConstraint(
            name='unique_season_episode_number',
            fields=['tmdb_season", "tmdb_episode_number'],
            deferrable=Deferrable.DEFERRED,
        )


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

    show = models.ForeignKey(Show, on_delete=models.PROTECT)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_NOT_WATCHED)
    updated_at = models.DateTimeField(null=False, default=timezone.now)

    class Meta:
        unique_together = (("user", "show"),)


class UserSeason(UserScore):
    season = models.ForeignKey(Season, on_delete=models.PROTECT)

    class Meta:
        unique_together = (("user", "season"),)


class UserEpisode(UserScore):
    episode = models.ForeignKey(Episode, on_delete=models.PROTECT)
    score = models.IntegerField(validators=[MinValueValidator(-1), MaxValueValidator(10)], default=-1)

    class Meta:
        unique_together = (("user", "episode"),)


class ShowLog(UserLogAbstract):
    ACTION_TYPE_EPISODES = 'episodes'
    ACTION_TYPE_CHOICES = *UserLogAbstract.ACTION_TYPE_CHOICES, (ACTION_TYPE_EPISODES, 'Episodes changed'),

    show = models.ForeignKey(Show, on_delete=models.PROTECT)


class SeasonLog(UserLogAbstract):
    season = models.ForeignKey(Season, on_delete=models.PROTECT)


class EpisodeLog(UserLogAbstract):
    episode = models.ForeignKey(Episode, on_delete=models.PROTECT)


class ShowGenre(models.Model):
    show = models.ForeignKey(Show, on_delete=models.CASCADE)
    genre = models.ForeignKey(Genre, on_delete=models.CASCADE)

    class Meta:
        unique_together = (("show", "genre"),)


class ShowPerson(models.Model):
    ROLE_ACTOR = 'actor'
    ROLE_DIRECTOR = 'director'
    ROLE_CHOICES = (
        (ROLE_ACTOR, 'Actor'),
        (ROLE_DIRECTOR, 'Director'),
    )

    show = models.ForeignKey(Show, on_delete=models.CASCADE)
    person = models.ForeignKey(Person, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = (("show", "person", "role"),)


class SeasonPerson(models.Model):
    ROLE_ACTOR = 'actor'
    ROLE_DIRECTOR = 'director'
    ROLE_CHOICES = (
        (ROLE_ACTOR, 'Actor'),
        (ROLE_DIRECTOR, 'Director'),
    )

    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    person = models.ForeignKey(Person, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = (("season", "person", "role"),)


class EpisodePerson(models.Model):
    ROLE_ACTOR = 'actor'
    ROLE_DIRECTOR = 'director'
    ROLE_CHOICES = (
        (ROLE_ACTOR, 'Actor'),
        (ROLE_DIRECTOR, 'Director'),
    )

    episode = models.ForeignKey(Episode, on_delete=models.CASCADE)
    person = models.ForeignKey(Person, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = (("episode", "person", "role"),)
