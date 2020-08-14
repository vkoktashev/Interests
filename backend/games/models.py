from django.db import models
from django.utils import timezone

from users.models import User, UserScore


class Game(models.Model):
    # rawg.io
    rawg_name = models.CharField(max_length=200)
    rawg_slug = models.CharField(max_length=200, unique=True)
    rawg_id = models.IntegerField(unique=True)
    # howlongtobeat
    hltb_name = models.CharField(max_length=200, blank=True)
    hltb_id = models.IntegerField(null=True, blank=True)


class UserGame(UserScore):
    GAME_STATUS_CHOICES = (
        ('playing', 'Playing'),
        ('completed', 'Completed'),
        ('stopped', 'Stopped playing'),
        ('going', 'Going to play')
    )

    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    status = models.CharField(max_length=30, choices=GAME_STATUS_CHOICES)

    class Meta:
        unique_together = (("user", "game"),)


class GameLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created = models.DateTimeField(default=timezone.now)
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    message = models.CharField(max_length=50)
