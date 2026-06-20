from django.contrib import admin

from utils.admin import ForceRefreshAdminMixin, SearchByIdAdminMixin
from .models import (
    Episode,
    EpisodeLog,
    Season,
    SeasonLog,
    Show,
    ShowLog,
    UserEpisode,
    UserSeason,
    UserShow,
)
from .tasks import refresh_episode_details, refresh_season_details, refresh_show_details


@admin.register(Show)
class ShowAdmin(ForceRefreshAdminMixin, SearchByIdAdminMixin, admin.ModelAdmin):
    list_display = (
        'tmdb_name',
        'tmdb_original_name',
        'tmdb_id',
        'tmdb_status',
        'tmdb_release_date',
        'tmdb_number_of_seasons',
        'tmdb_number_of_episodes',
    )
    search_fields = ('tmdb_name', 'tmdb_original_name', 'imdb_id')
    search_id_fields = ('pk', 'tmdb_id')
    search_help_text = 'Русское или оригинальное название, IMDb ID, внутренний ID или TMDB ID'
    list_filter = ('tmdb_status', 'tmdb_release_date', 'tmdb_last_update')
    date_hierarchy = 'tmdb_release_date'
    ordering = ('tmdb_name',)
    list_per_page = 50

    def enqueue_force_refresh(self, obj):
        return refresh_show_details.delay(obj.tmdb_id, force=True)


@admin.register(Season)
class SeasonAdmin(ForceRefreshAdminMixin, SearchByIdAdminMixin, admin.ModelAdmin):
    list_display = ('tmdb_name', 'show_name', 'tmdb_season_number', 'tmdb_id', 'tmdb_air_date', 'tmdb_last_update')
    search_fields = ('tmdb_name', 'tmdb_show__tmdb_name', 'tmdb_show__tmdb_original_name')
    search_id_fields = ('pk', 'tmdb_id', 'tmdb_show__tmdb_id')
    search_help_text = 'Название сезона или сериала, внутренний ID или TMDB ID'
    list_filter = ('tmdb_air_date', 'tmdb_last_update')
    autocomplete_fields = ('tmdb_show',)
    list_select_related = ('tmdb_show',)
    date_hierarchy = 'tmdb_air_date'
    ordering = ('tmdb_show__tmdb_name', 'tmdb_season_number')
    list_per_page = 50

    @admin.display(description='Сериал', ordering='tmdb_show__tmdb_name')
    def show_name(self, obj):
        return obj.tmdb_show.tmdb_name

    def enqueue_force_refresh(self, obj):
        return refresh_season_details.delay(
            obj.tmdb_show.tmdb_id,
            obj.tmdb_season_number,
            force=True,
        )


@admin.register(Episode)
class EpisodeAdmin(ForceRefreshAdminMixin, SearchByIdAdminMixin, admin.ModelAdmin):
    list_display = ('tmdb_name', 'show_name', 'season_number', 'tmdb_episode_number', 'tmdb_id', 'tmdb_release_date')
    search_fields = (
        'tmdb_name',
        'tmdb_season__tmdb_name',
        'tmdb_season__tmdb_show__tmdb_name',
        'tmdb_season__tmdb_show__tmdb_original_name',
    )
    search_id_fields = ('pk', 'tmdb_id', 'tmdb_season__tmdb_id', 'tmdb_season__tmdb_show__tmdb_id')
    search_help_text = 'Название серии, сезона или сериала, внутренний ID или TMDB ID'
    list_filter = ('tmdb_release_date', 'tmdb_last_update')
    autocomplete_fields = ('tmdb_season',)
    list_select_related = ('tmdb_season', 'tmdb_season__tmdb_show')
    date_hierarchy = 'tmdb_release_date'
    ordering = ('tmdb_season__tmdb_show__tmdb_name', 'tmdb_season__tmdb_season_number', 'tmdb_episode_number')
    list_per_page = 50

    @admin.display(description='Сериал', ordering='tmdb_season__tmdb_show__tmdb_name')
    def show_name(self, obj):
        return obj.tmdb_season.tmdb_show.tmdb_name

    @admin.display(description='Сезон', ordering='tmdb_season__tmdb_season_number')
    def season_number(self, obj):
        return obj.tmdb_season.tmdb_season_number

    def enqueue_force_refresh(self, obj):
        season = obj.tmdb_season
        return refresh_episode_details.delay(
            season.tmdb_show.tmdb_id,
            season.tmdb_season_number,
            obj.tmdb_episode_number,
            force=True,
        )


class UserMediaAdmin(SearchByIdAdminMixin, admin.ModelAdmin):
    list_filter = ('score',)
    autocomplete_fields = ('user',)
    list_select_related = ('user',)
    list_per_page = 50


@admin.register(UserShow)
class UserShowAdmin(UserMediaAdmin):
    list_display = ('user', 'show', 'status', 'score', 'updated_at')
    list_filter = ('status', 'score', 'updated_at')
    search_fields = ('user__username', 'user__email', 'show__tmdb_name', 'show__tmdb_original_name')
    search_id_fields = ('pk', 'user_id', 'show_id', 'show__tmdb_id')
    search_help_text = 'Пользователь, email, название сериала или числовой ID'
    autocomplete_fields = ('user', 'show')
    list_select_related = ('user', 'show')
    date_hierarchy = 'updated_at'


@admin.register(UserSeason)
class UserSeasonAdmin(UserMediaAdmin):
    list_display = ('user', 'season', 'score')
    search_fields = ('user__username', 'user__email', 'season__tmdb_name', 'season__tmdb_show__tmdb_name')
    search_id_fields = ('pk', 'user_id', 'season_id', 'season__tmdb_id')
    autocomplete_fields = ('user', 'season')
    list_select_related = ('user', 'season', 'season__tmdb_show')


@admin.register(UserEpisode)
class UserEpisodeAdmin(UserMediaAdmin):
    list_display = ('user', 'episode', 'score')
    search_fields = ('user__username', 'user__email', 'episode__tmdb_name', 'episode__tmdb_season__tmdb_show__tmdb_name')
    search_id_fields = ('pk', 'user_id', 'episode_id', 'episode__tmdb_id')
    autocomplete_fields = ('user', 'episode')
    list_select_related = ('user', 'episode', 'episode__tmdb_season', 'episode__tmdb_season__tmdb_show')


class MediaLogAdmin(SearchByIdAdminMixin, admin.ModelAdmin):
    list_display = ('user', 'action_type', 'action_result', 'created')
    list_filter = ('action_type', 'created')
    autocomplete_fields = ('user',)
    list_select_related = ('user',)
    date_hierarchy = 'created'
    list_per_page = 50


@admin.register(ShowLog)
class ShowLogAdmin(MediaLogAdmin):
    list_display = ('user', 'show', 'action_type', 'action_result', 'created')
    search_fields = ('user__username', 'user__email', 'show__tmdb_name', 'show__tmdb_original_name')
    search_id_fields = ('pk', 'user_id', 'show_id', 'show__tmdb_id')
    autocomplete_fields = ('user', 'show')
    list_select_related = ('user', 'show')


@admin.register(SeasonLog)
class SeasonLogAdmin(MediaLogAdmin):
    list_display = ('user', 'season', 'action_type', 'action_result', 'created')
    search_fields = ('user__username', 'user__email', 'season__tmdb_name', 'season__tmdb_show__tmdb_name')
    search_id_fields = ('pk', 'user_id', 'season_id', 'season__tmdb_id')
    autocomplete_fields = ('user', 'season')
    list_select_related = ('user', 'season', 'season__tmdb_show')


@admin.register(EpisodeLog)
class EpisodeLogAdmin(MediaLogAdmin):
    list_display = ('user', 'episode', 'action_type', 'action_result', 'created')
    search_fields = ('user__username', 'user__email', 'episode__tmdb_name', 'episode__tmdb_season__tmdb_show__tmdb_name')
    search_id_fields = ('pk', 'user_id', 'episode_id', 'episode__tmdb_id')
    autocomplete_fields = ('user', 'episode')
    list_select_related = ('user', 'episode', 'episode__tmdb_season', 'episode__tmdb_season__tmdb_show')
