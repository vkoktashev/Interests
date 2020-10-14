from django.contrib import admin
from .models import Movie, UserMovie, MovieLog
# Register your models here.
admin.site.register(Movie)
admin.site.register(UserMovie)
admin.site.register(MovieLog)