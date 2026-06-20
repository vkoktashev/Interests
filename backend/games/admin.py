from django.contrib import admin

from utils.admin import ForceRefreshAdminMixin, SearchByIdAdminMixin
from .models import Game, GameDeveloper, GameLog, UserGame
from .tasks import refresh_game_details, refresh_game_details_by_igdb_id


class GameDeveloperInline(admin.TabularInline):
    model = GameDeveloper
    autocomplete_fields = ('developer',)
    fields = ('developer', 'sort_order')
    extra = 0
    show_change_link = True


@admin.register(Game)
class GameAdmin(ForceRefreshAdminMixin, SearchByIdAdminMixin, admin.ModelAdmin):
    list_display = ('igdb_name', 'igdb_id', 'igdb_release_date', 'igdb_platforms', 'igdb_last_update')
    search_fields = ('igdb_name', 'hltb_name', 'igdb_slug', 'rawg_slug')
    search_id_fields = ('pk', 'igdb_id', 'rawg_id', 'hltb_id')
    search_help_text = 'Название, slug или числовой ID (внутренний, IGDB, RAWG, HLTB)'
    list_filter = ('igdb_release_date', 'igdb_last_update')
    date_hierarchy = 'igdb_release_date'
    ordering = ('igdb_name',)
    list_per_page = 50
    inlines = (GameDeveloperInline,)

    def enqueue_force_refresh(self, obj):
        if obj.igdb_id:
            return refresh_game_details_by_igdb_id.delay(obj.igdb_id)
        if obj.igdb_slug:
            return refresh_game_details.delay(obj.igdb_slug)
        raise ValueError('у игры нет IGDB ID или slug')


@admin.register(GameDeveloper)
class GameDeveloperAdmin(SearchByIdAdminMixin, admin.ModelAdmin):
    list_display = ('game', 'developer', 'sort_order')
    search_fields = ('game__igdb_name', 'game__igdb_slug', 'developer__name')
    search_id_fields = ('pk', 'game_id', 'game__igdb_id', 'developer_id', 'developer__igdb_id')
    search_help_text = 'Название игры или студии, slug либо числовой ID'
    autocomplete_fields = ('game', 'developer')
    list_select_related = ('game', 'developer')
    ordering = ('game__igdb_name', 'sort_order')
    list_per_page = 50


@admin.register(UserGame)
class UserGameAdmin(SearchByIdAdminMixin, admin.ModelAdmin):
    list_display = ('user', 'game', 'status', 'score', 'spent_time', 'updated_at')
    list_filter = ('status', 'score', 'updated_at')
    search_fields = ('user__username', 'user__email', 'game__igdb_name', 'game__igdb_slug')
    search_id_fields = ('pk', 'user_id', 'game_id', 'game__igdb_id')
    search_help_text = 'Пользователь, email, название игры, slug или числовой ID'
    autocomplete_fields = ('user', 'game')
    list_select_related = ('user', 'game')
    date_hierarchy = 'updated_at'
    list_per_page = 50


@admin.register(GameLog)
class GameLogAdmin(SearchByIdAdminMixin, admin.ModelAdmin):
    list_display = ('user', 'game', 'action_type', 'action_result', 'created')
    list_filter = ('action_type', 'created')
    search_fields = ('user__username', 'user__email', 'game__igdb_name')
    search_id_fields = ('pk', 'user_id', 'game_id', 'game__igdb_id')
    autocomplete_fields = ('user', 'game')
    list_select_related = ('user', 'game')
    date_hierarchy = 'created'
    list_per_page = 50
