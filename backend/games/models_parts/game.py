from django.db import models


class Game(models.Model):
    IGDB_RELEASE_DATE_FORMAT_EXACT = 0
    IGDB_RELEASE_DATE_FORMAT_MONTH = 1
    IGDB_RELEASE_DATE_FORMAT_YEAR = 2
    IGDB_RELEASE_DATE_FORMAT_Q1 = 3
    IGDB_RELEASE_DATE_FORMAT_Q2 = 4
    IGDB_RELEASE_DATE_FORMAT_Q3 = 5
    IGDB_RELEASE_DATE_FORMAT_Q4 = 6
    IGDB_RELEASE_DATE_FORMAT_TBD = 7

    # rawg.io
    rawg_slug = models.CharField(max_length=200, unique=True, null=True, blank=True)
    rawg_id = models.IntegerField(unique=True, null=True, blank=True)
    red_tigerino_playlist_url = models.URLField(blank=True)
    # igdb.com
    igdb_id = models.IntegerField(null=True, blank=True)
    igdb_name = models.CharField(max_length=200, blank=True)
    igdb_slug = models.CharField(max_length=200, blank=True)
    igdb_year = models.IntegerField(null=True, blank=True)
    igdb_release_date = models.DateField(null=True, blank=True)
    igdb_release_date_format = models.IntegerField(null=True, blank=True)
    igdb_release_date_display = models.CharField(max_length=50, blank=True)
    igdb_summary = models.TextField(blank=True)
    igdb_rating = models.FloatField(null=True, blank=True)
    igdb_rating_count = models.IntegerField(null=True, blank=True)
    igdb_aggregated_rating = models.FloatField(null=True, blank=True)
    igdb_aggregated_rating_count = models.IntegerField(null=True, blank=True)
    igdb_cover_url = models.URLField(max_length=500, blank=True)
    igdb_platforms = models.TextField(blank=True)
    igdb_videos_count = models.IntegerField(null=True, blank=True)
    igdb_screenshots_count = models.IntegerField(null=True, blank=True)
    igdb_url = models.URLField(max_length=500, blank=True)
    igdb_last_update = models.DateTimeField(null=True, blank=True)
    # howlongtobeat
    hltb_name = models.CharField(max_length=200, blank=True)
    hltb_id = models.IntegerField(null=True, blank=True)

    def __str__(self):
        return self.igdb_name or self.hltb_name or self.igdb_slug or f'Game #{self.pk}'

    class Meta:
        verbose_name = 'игра'
        verbose_name_plural = 'игры'


class Genre(models.Model):
    igdb_id = models.IntegerField(primary_key=True)
    igdb_name = models.CharField(max_length=100)
    igdb_slug = models.CharField(max_length=100, blank=True)


class Store(models.Model):
    igdb_id = models.IntegerField(primary_key=True)
    igdb_name = models.CharField(max_length=100)
    igdb_slug = models.CharField(max_length=100, unique=True)
