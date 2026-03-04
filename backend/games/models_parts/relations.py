from django.db import models

from games.models_parts.game import Game, Genre, Store


class GameGenre(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    genre = models.ForeignKey(Genre, on_delete=models.CASCADE)

    class Meta:
        unique_together = (("game", "genre"),)


class GameStore(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    store = models.ForeignKey(Store, on_delete=models.CASCADE)
    url = models.URLField(max_length=500, blank=True)

    class Meta:
        unique_together = (("game", "store"),)


class GameDeveloper(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    developer = models.ForeignKey('people.Developer', on_delete=models.CASCADE)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = (("game", "developer"),)


class GameTrailer(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    igdb_id = models.IntegerField(null=True, blank=True)
    igdb_video_id = models.CharField(max_length=100, blank=True)
    name = models.CharField(max_length=255, blank=True)
    url = models.URLField(max_length=500, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ('sort_order', 'id')


class GameScreenshot(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    igdb_id = models.IntegerField(null=True, blank=True)
    image = models.URLField(max_length=500, blank=True)
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ('sort_order', 'id')


class GameBeatTime(models.Model):
    TYPE_MAIN = 'main'
    TYPE_EXTRA = 'extra'
    TYPE_COMPLETE = 'complete'
    TYPE_CHOICES = (
        (TYPE_MAIN, 'Main'),
        (TYPE_EXTRA, 'Extra'),
        (TYPE_COMPLETE, 'Complete'),
    )

    SOURCE_IGDB = 'igdb'
    SOURCE_HLTB = 'hltb'
    SOURCE_CHOICES = (
        (SOURCE_IGDB, 'IGDB'),
        (SOURCE_HLTB, 'HLTB'),
    )

    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    type = models.CharField(max_length=16, choices=TYPE_CHOICES)
    source = models.CharField(max_length=16, choices=SOURCE_CHOICES)
    hours = models.DecimalField(max_digits=6, decimal_places=2)

    class Meta:
        unique_together = (("game", "type", "source"),)
        ordering = ('game_id', 'source', 'type', 'id')
