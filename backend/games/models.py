from django.db import models

from users.models import User, UserScore


class Game(models.Model):
    # rawg.io
    rawg_name = models.CharField(max_length=200)
    rawg_slug = models.CharField(max_length=200, unique=True)
    rawg_id = models.IntegerField(unique=True)
    # howlongtobeat
    hltb_name = models.CharField(max_length=200, null=True)
    hltb_id = models.IntegerField(null=True)


# GAME_STATUS_CHOICES = (
#     ()
# )

class UserGame(UserScore):
    game = models.ForeignKey(Game, on_delete=models.CASCADE)

    # status = models.CharField()

    class Meta:
        unique_together = (("user", "game"),)
