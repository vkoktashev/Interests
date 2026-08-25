from django.db import models
class Video(models.Model):
    SOURCE_TMDB = 'tmdb'
    SOURCE_IGDB = 'igdb'
    TYPE_TRAILER = 'Trailer'

    external_id = models.CharField(max_length=100, blank=True)
    name = models.CharField(max_length=255, blank=True)
    url = models.URLField(max_length=500)
    source = models.CharField(max_length=50)
    platform = models.CharField(max_length=50, blank=True)
    type = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ('id',)
        constraints = (
            models.UniqueConstraint(
                fields=('source', 'url'), name='unique_source_video_url',
            ),
        )

    def __str__(self):
        return self.name or self.url
