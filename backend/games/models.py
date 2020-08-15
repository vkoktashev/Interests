from django.db import models

from users.models import UserScore, UserLog


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
        (STATUS_PLAYING, 'Playing'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_STOPPED, 'Stopped playing'),
        (STATUS_GOING, 'Going to play'),
        (STATUS_NOT_PLAYED, 'Not played')
    )

    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES)

    class Meta:
        unique_together = (("user", "game"),)


class GameLog(UserLog):
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
