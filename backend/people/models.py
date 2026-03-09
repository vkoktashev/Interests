from django.db import models


class Person(models.Model):
    tmdb_id = models.IntegerField(unique=True)
    imdb_id = models.CharField(max_length=20, blank=True)
    name = models.CharField(max_length=200)
    tmdb_popularity = models.FloatField(null=True)
    tmdb_also_known_as = models.JSONField(default=list, blank=True)
    tmdb_birthday = models.DateField(null=True)
    tmdb_deathday = models.DateField(null=True)
    tmdb_biography = models.TextField(blank=True)
    tmdb_place_of_birth = models.CharField(max_length=200, blank=True)
    tmdb_profile_path = models.CharField(max_length=200, blank=True)
    tmdb_last_update = models.DateTimeField(null=True)

    class Meta:
        db_table = 'people_person'


class Developer(models.Model):
    igdb_id = models.IntegerField(unique=True)
    name = models.CharField(max_length=200)
    is_publisher = models.BooleanField(default=False)

    class Meta:
        db_table = 'people_developer'
