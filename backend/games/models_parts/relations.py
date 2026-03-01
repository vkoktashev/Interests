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
    url = models.CharField(max_length=200, blank=True)

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
    rawg_id = models.IntegerField(null=True, blank=True)
    name = models.CharField(max_length=255, blank=True)
    preview = models.URLField(max_length=500, blank=True)
    url = models.URLField(max_length=500, blank=True)
    video_max = models.URLField(max_length=500, blank=True)
    video_480 = models.URLField(max_length=500, blank=True)
    video_320 = models.URLField(max_length=500, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ('sort_order', 'id')


class GameScreenshot(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    rawg_id = models.IntegerField(null=True, blank=True)
    image = models.URLField(max_length=500, blank=True)
    width = models.IntegerField(null=True, blank=True)
    height = models.IntegerField(null=True, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ('sort_order', 'id')
