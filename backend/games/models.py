from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from users.models import UserScore, UserLog, UserLogAbstract


class Game(models.Model):
    # rawg.io
    rawg_name = models.CharField(max_length=200)
    rawg_slug = models.CharField(max_length=200, unique=True)
    rawg_id = models.IntegerField(unique=True)
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

    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_NOT_PLAYED)
    spent_time = models.DecimalField(validators=[MinValueValidator(0.0)], default=0.0, max_digits=7, decimal_places=1)
    updated_at = models.DateTimeField(null=False, default=timezone.now)

    class Meta:
        unique_together = (("user", "game"),)


class GameLog(UserLogAbstract):
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
