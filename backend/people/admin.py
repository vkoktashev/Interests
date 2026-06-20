from django.contrib import admin

from utils.admin import SearchByIdAdminMixin
from .models import Developer, Person


@admin.register(Person)
class PersonAdmin(SearchByIdAdminMixin, admin.ModelAdmin):
    list_display = (
        'name',
        'tmdb_id',
        'imdb_id',
        'tmdb_birthday',
        'tmdb_deathday',
        'tmdb_place_of_birth',
        'tmdb_popularity',
        'tmdb_last_update',
    )
    search_fields = ('name', 'imdb_id')
    search_id_fields = ('pk', 'tmdb_id')
    search_help_text = 'Имя, IMDb ID, внутренний ID или TMDB ID'
    list_filter = ('tmdb_birthday', 'tmdb_deathday', 'tmdb_last_update')
    ordering = ('name',)
    list_per_page = 50


@admin.register(Developer)
class DeveloperAdmin(SearchByIdAdminMixin, admin.ModelAdmin):
    list_display = ('name', 'igdb_id', 'is_publisher')
    search_fields = ('name',)
    search_id_fields = ('pk', 'igdb_id')
    search_help_text = 'Название студии, внутренний ID или IGDB ID'
    list_filter = ('is_publisher',)
    ordering = ('name',)
    list_per_page = 50
