from django.db import models


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


class Genre(models.Model):
    rawg_id = models.IntegerField(primary_key=True)
    rawg_name = models.CharField(max_length=100)
    rawg_slug = models.CharField(max_length=100, unique=True)


class Store(models.Model):
    rawg_id = models.IntegerField(primary_key=True)
    rawg_name = models.CharField(max_length=100)
    rawg_slug = models.CharField(max_length=100, unique=True)
