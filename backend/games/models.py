from django.db import models

from users.models import User, UserScore


class Game(models.Model):
    # rawg.io
    rawg_name = models.CharField(max_length=200)
    rawg_slug = models.CharField(max_length=200)
    rawg_id = models.IntegerField()
    # howlongtobeat
    hltb_name = models.CharField(max_length=200, null=True)
    hltb_id = models.IntegerField(null=True)


class UserGameScore(UserScore):
    game = models.ForeignKey(Game, on_delete=models.CASCADE)

    class Meta:
        unique_together = (("user", "game"),)
