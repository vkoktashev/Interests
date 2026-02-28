from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from users.models import UserScore, UserLog, UserLogAbstract


class Game(models.Model):
    # rawg.io
    rawg_name = models.CharField(max_length=200)
    rawg_slug = models.CharField(max_length=200, unique=True)
    rawg_id = models.IntegerField(unique=True)
    rawg_release_date = models.DateField(null=True)
    rawg_tba = models.BooleanField(default=False)
    rawg_backdrop_path = models.CharField(max_length=200, blank=True)
    rawg_poster_path = models.CharField(max_length=200, blank=True)
    rawg_description = models.TextField(blank=True)
    rawg_metacritic = models.IntegerField(null=True, blank=True)
    rawg_platforms = models.TextField(blank=True)
    rawg_playtime = models.IntegerField(default=0)
    rawg_movies_count = models.IntegerField(null=True, blank=True)
    rawg_screenshots_count = models.IntegerField(null=True, blank=True)
    red_tigerino_playlist_url = models.URLField(blank=True)
    rawg_last_update = models.DateTimeField(null=True, blank=True)
    # igdb.com
    igdb_id = models.IntegerField(null=True, blank=True)
    igdb_name = models.CharField(max_length=200, blank=True)
    igdb_slug = models.CharField(max_length=200, blank=True)
    igdb_year = models.IntegerField(null=True, blank=True)
    # howlongtobeat
    hltb_name = models.CharField(max_length=200, blank=True)
    hltb_id = models.IntegerField(null=True, blank=True)


class UserGame(UserScore):
    STATUS_PLAYING = 'playing'
    STATUS_COMPLETED = 'completed'
    STATUS_STOPPED = 'stopped'
    STATUS_GOING = 'going'
    STATUS_NOT_PLAYED = 'not played'

    STATUS_CHOICES = (
        (STATUS_PLAYING, 'Играю'),
        (STATUS_COMPLETED, 'Прошел'),
        (STATUS_STOPPED, 'Дропнул'),
        (STATUS_GOING, 'Буду играть'),
        (STATUS_NOT_PLAYED, 'Не играл')
    )

    game = models.ForeignKey(Game, on_delete=models.PROTECT)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_NOT_PLAYED)
    spent_time = models.DecimalField(validators=[MinValueValidator(0.0)], default=0.0, max_digits=7, decimal_places=1)
    updated_at = models.DateTimeField(null=False, default=timezone.now)

    class Meta:
        unique_together = (("user", "game"),)


class GameLog(UserLogAbstract):
    game = models.ForeignKey(Game, on_delete=models.PROTECT)


class Genre(models.Model):
    rawg_id = models.IntegerField(primary_key=True)
    rawg_name = models.CharField(max_length=100)
    rawg_slug = models.CharField(max_length=100, unique=True)


class GameGenre(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    genre = models.ForeignKey(Genre, on_delete=models.CASCADE)

    class Meta:
        unique_together = (("game", "genre"),)


class Store(models.Model):
    rawg_id = models.IntegerField(primary_key=True)
    rawg_name = models.CharField(max_length=100)
    rawg_slug = models.CharField(max_length=100, unique=True)


class GameStore(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    store = models.ForeignKey(Store, on_delete=models.CASCADE)
    url = models.CharField(max_length=200, blank=True)

    class Meta:
        unique_together = (("game", "store"),)


class GameDeveloper(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    developer = models.ForeignKey('people.Developer', on_delete=models.CASCADE)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = (("game", "developer"),)


class GameTrailer(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    rawg_id = models.IntegerField(null=True, blank=True)
    name = models.CharField(max_length=255, blank=True)
    preview = models.URLField(max_length=500, blank=True)
    url = models.URLField(max_length=500, blank=True)
    video_max = models.URLField(max_length=500, blank=True)
    video_480 = models.URLField(max_length=500, blank=True)
    video_320 = models.URLField(max_length=500, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ('sort_order', 'id')


class GameScreenshot(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    rawg_id = models.IntegerField(null=True, blank=True)
    image = models.URLField(max_length=500, blank=True)
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ('sort_order', 'id')
