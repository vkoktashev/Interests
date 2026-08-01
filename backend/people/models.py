from django.db import models
from django.utils import timezone


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
        verbose_name = 'человек'
        verbose_name_plural = 'люди'

    def __str__(self):
        return self.name or f'Person #{self.tmdb_id}'


class UserPerson(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='tracked_people')
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name='tracked_by_users')
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'people_user_person'
        ordering = ('-created',)
        unique_together = (('user', 'person'),)
        verbose_name = 'отслеживаемый человек'
        verbose_name_plural = 'отслеживаемые люди'

    def __str__(self):
        return f'{self.user} — {self.person}'


class PersonLog(models.Model):
    ACTION_TYPE_TRACK = 'is_tracking'
    ACTION_TYPE_CHOICES = (
        (ACTION_TYPE_TRACK, 'Tracking status changed'),
    )

    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    person = models.ForeignKey(Person, on_delete=models.PROTECT)
    created = models.DateTimeField(default=timezone.now)
    action_result = models.CharField(max_length=5)
    action_type = models.CharField(max_length=30, choices=ACTION_TYPE_CHOICES)

    class Meta:
        verbose_name = 'лог отслеживания человека'
        verbose_name_plural = 'логи отслеживания людей'


class Developer(models.Model):
    igdb_id = models.IntegerField(unique=True)
    name = models.CharField(max_length=200)
    is_publisher = models.BooleanField(default=False)

    class Meta:
        db_table = 'people_developer'
        verbose_name = 'игровая студия'
        verbose_name_plural = 'игровые студии'

    def __str__(self):
        return self.name or f'Developer #{self.igdb_id}'
