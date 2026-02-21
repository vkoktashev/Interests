from django.db import models


class Person(models.Model):
    tmdb_id = models.IntegerField(unique=True)
    name = models.CharField(max_length=200)

    class Meta:
        db_table = 'people_person'
