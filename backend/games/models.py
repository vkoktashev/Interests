from django.db import models


class Game(models.Model):
    # rawg.io
    rawg_name = models.CharField(max_length=200)
    rawg_slug = models.CharField(max_length=200)
    rawg_id = models.IntegerField()
    # howlongtobeat
    hltb_name = models.CharField(max_length=200)
    hltb_id = models.IntegerField()
