from django.conf import settings
from django.db import models


class Collection(models.Model):
    DISPLAY_MODE_MIXED = 'mixed'
    DISPLAY_MODE_GROUPED = 'grouped'
    DISPLAY_MODE_CHOICES = (
        (DISPLAY_MODE_MIXED, 'Смешанная'),
        (DISPLAY_MODE_GROUPED, 'Раздельная'),
    )
    PRIVACY_PUBLIC = 'public'
    PRIVACY_PRIVATE = 'private'
    PRIVACY_CHOICES = (
        (PRIVACY_PUBLIC, 'Публичная'),
        (PRIVACY_PRIVATE, 'Приватная'),
    )

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='collections',
    )
    system_key = models.CharField(max_length=64, unique=True, null=True, blank=True)
    subscribers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='subscribed_collections',
    )
    title = models.CharField(max_length=200)
    description = models.TextField('Описание', blank=True, default='', max_length=2000)
    display_mode = models.CharField(
        max_length=16,
        choices=DISPLAY_MODE_CHOICES,
        default=DISPLAY_MODE_MIXED,
    )
    privacy = models.CharField(
        max_length=16,
        choices=PRIVACY_CHOICES,
        default=PRIVACY_PUBLIC,
    )
    games = models.ManyToManyField('games.Game', blank=True, related_name='collections')
    movies = models.ManyToManyField('movies.Movie', blank=True, related_name='collections')
    shows = models.ManyToManyField('shows.Show', blank=True, related_name='collections')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = 'подборка'
        verbose_name_plural = 'подборки'


class CollectionItemOrder(models.Model):
    MEDIA_TYPE_GAME = 'game'
    MEDIA_TYPE_MOVIE = 'movie'
    MEDIA_TYPE_SHOW = 'show'
    MEDIA_TYPE_CHOICES = (
        (MEDIA_TYPE_GAME, 'Игра'),
        (MEDIA_TYPE_MOVIE, 'Фильм'),
        (MEDIA_TYPE_SHOW, 'Сериал'),
    )

    collection = models.ForeignKey(
        Collection,
        on_delete=models.CASCADE,
        related_name='item_orders',
    )
    media_type = models.CharField(max_length=16, choices=MEDIA_TYPE_CHOICES)
    object_id = models.PositiveIntegerField()
    position = models.PositiveIntegerField(default=0)
    caption = models.TextField('Подпись', blank=True, default='', max_length=2000)

    class Meta:
        ordering = ('position', 'id')
        constraints = (
            models.UniqueConstraint(
                fields=('collection', 'media_type', 'object_id'),
                name='unique_collection_item_order',
            ),
            models.UniqueConstraint(
                fields=('collection', 'position'),
                name='unique_collection_item_position',
            ),
            models.CheckConstraint(
                condition=models.Q(media_type__in=('game', 'movie', 'show')),
                name='valid_collection_item_media_type',
            ),
        )
        verbose_name = 'порядок элемента подборки'
        verbose_name_plural = 'порядок элементов подборки'
