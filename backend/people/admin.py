from django.contrib import admin

from utils.admin import SearchByIdAdminMixin
from .models import Developer, Person, PersonCredit, PersonLog, UserPerson


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
        'tmdb_credits_last_update',
    )
    search_fields = ('name', 'imdb_id')
    search_id_fields = ('pk', 'tmdb_id')
    search_help_text = 'Имя, IMDb ID, внутренний ID или TMDB ID'
    list_filter = ('tmdb_birthday', 'tmdb_deathday', 'tmdb_last_update')
    ordering = ('name',)
    list_per_page = 50


@admin.register(PersonCredit)
class PersonCreditAdmin(SearchByIdAdminMixin, admin.ModelAdmin):
    list_display = ('person', 'name', 'media_type', 'release_date', 'roles', 'updated_at')
    list_filter = ('media_type', 'release_date', 'updated_at')
    search_fields = ('person__name', 'name')
    search_id_fields = ('pk', 'person_id', 'tmdb_id')
    autocomplete_fields = ('person',)
    list_select_related = ('person',)
    date_hierarchy = 'release_date'
    ordering = ('-release_date', 'name')
    list_per_page = 50


@admin.register(UserPerson)
class UserPersonAdmin(SearchByIdAdminMixin, admin.ModelAdmin):
    list_display = ('user', 'person', 'created')
    search_fields = ('user__username', 'user__email', 'person__name')
    search_id_fields = ('pk', 'user_id', 'person_id')
    autocomplete_fields = ('user', 'person')
    list_select_related = ('user', 'person')
    date_hierarchy = 'created'
    ordering = ('-created',)
    list_per_page = 50


@admin.register(PersonLog)
class PersonLogAdmin(SearchByIdAdminMixin, admin.ModelAdmin):
    list_display = ('user', 'person', 'action_type', 'action_result', 'created')
    list_filter = ('action_type', 'created')
    search_fields = ('user__username', 'user__email', 'person__name')
    search_id_fields = ('pk', 'user_id', 'person_id')
    autocomplete_fields = ('user', 'person')
    list_select_related = ('user', 'person')
    date_hierarchy = 'created'
    ordering = ('-created',)
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
