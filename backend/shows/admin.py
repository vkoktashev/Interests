from django.contrib import admin

from .models import *

# Register your models here.
admin.site.register(Show)
admin.site.register(Season)
admin.site.register(Episode)
admin.site.register(UserShow)
admin.site.register(UserSeason)
admin.site.register(UserEpisode)
admin.site.register(ShowLog)
admin.site.register(SeasonLog)
admin.site.register(EpisodeLog)
