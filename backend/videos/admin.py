from django.contrib import admin

from videos.models import Video


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ('name', 'external_id', 'source', 'platform', 'type')
    list_filter = ('source', 'platform', 'type')
    search_fields = (
        'name',
        'external_id',
        'url',
    )
    ordering = ('id',)
    list_per_page = 50
