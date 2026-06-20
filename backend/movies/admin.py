from django.contrib import admin

from utils.admin import ForceRefreshAdminMixin, SearchByIdAdminMixin
from .models import Movie, MovieLog, UserMovie
from .tasks import refresh_movie_details


@admin.register(Movie)
class MovieAdmin(ForceRefreshAdminMixin, SearchByIdAdminMixin, admin.ModelAdmin):
    list_display = (
        'tmdb_name',
        'tmdb_original_name',
        'tmdb_id',
        'tmdb_release_date',
        'tmdb_digital_release_date',
        'tmdb_last_update',
    )
    search_fields = ('tmdb_name', 'tmdb_original_name', 'imdb_id')
    search_id_fields = ('pk', 'tmdb_id')
    search_help_text = 'Русское или оригинальное название, IMDb ID, внутренний ID или TMDB ID'
    list_filter = ('tmdb_release_date', 'tmdb_digital_release_date', 'tmdb_last_update')
    date_hierarchy = 'tmdb_release_date'
    ordering = ('tmdb_name',)
    list_per_page = 50

    def enqueue_force_refresh(self, obj):
        return refresh_movie_details.delay(obj.tmdb_id, force=True)


@admin.register(UserMovie)
class UserMovieAdmin(SearchByIdAdminMixin, admin.ModelAdmin):
    list_display = ('user', 'movie', 'status', 'score', 'updated_at')
    list_filter = ('status', 'score', 'updated_at')
    search_fields = ('user__username', 'user__email', 'movie__tmdb_name', 'movie__tmdb_original_name')
    search_id_fields = ('pk', 'user_id', 'movie_id', 'movie__tmdb_id')
    search_help_text = 'Пользователь, email, название фильма или числовой ID'
    autocomplete_fields = ('user', 'movie')
    list_select_related = ('user', 'movie')
    date_hierarchy = 'updated_at'
    list_per_page = 50


@admin.register(MovieLog)
class MovieLogAdmin(SearchByIdAdminMixin, admin.ModelAdmin):
    list_display = ('user', 'movie', 'action_type', 'action_result', 'created')
    list_filter = ('action_type', 'created')
    search_fields = ('user__username', 'user__email', 'movie__tmdb_name', 'movie__tmdb_original_name')
    search_id_fields = ('pk', 'user_id', 'movie_id', 'movie__tmdb_id')
    autocomplete_fields = ('user', 'movie')
    list_select_related = ('user', 'movie')
    date_hierarchy = 'created'
    list_per_page = 50
