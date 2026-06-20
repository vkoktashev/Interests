from django.contrib import admin

from utils.admin import SearchByIdAdminMixin
from .models import User, UserFollow, UserLog, UserPasswordToken


@admin.register(User)
class UserAdmin(SearchByIdAdminMixin, admin.ModelAdmin):
    list_display = ('username', 'email', 'is_active', 'is_staff', 'privacy', 'date_joined', 'last_activity')
    list_filter = ('is_active', 'is_staff', 'is_superuser', 'privacy', 'gender', 'date_joined')
    search_fields = ('username', 'email', 'google_email')
    search_id_fields = ('pk',)
    search_help_text = 'Имя пользователя, email или числовой ID'
    date_hierarchy = 'date_joined'
    ordering = ('username',)
    list_per_page = 50


@admin.register(UserFollow)
class UserFollowAdmin(SearchByIdAdminMixin, admin.ModelAdmin):
    list_display = ('user', 'followed_user', 'is_following')
    list_filter = ('is_following',)
    search_fields = ('user__username', 'user__email', 'followed_user__username', 'followed_user__email')
    search_id_fields = ('pk', 'user_id', 'followed_user_id')
    autocomplete_fields = ('user', 'followed_user')
    list_select_related = ('user', 'followed_user')
    list_per_page = 50


@admin.register(UserLog)
class UserLogAdmin(SearchByIdAdminMixin, admin.ModelAdmin):
    list_display = ('user', 'followed_user', 'action_type', 'action_result', 'created')
    list_filter = ('action_type', 'created')
    search_fields = ('user__username', 'user__email', 'followed_user__username', 'followed_user__email')
    search_id_fields = ('pk', 'user_id', 'followed_user_id')
    autocomplete_fields = ('user', 'followed_user')
    list_select_related = ('user', 'followed_user')
    date_hierarchy = 'created'
    list_per_page = 50


@admin.register(UserPasswordToken)
class UserPasswordTokenAdmin(SearchByIdAdminMixin, admin.ModelAdmin):
    list_display = ('user', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('user__username', 'user__email')
    search_id_fields = ('pk', 'user_id')
    autocomplete_fields = ('user',)
    list_select_related = ('user',)
    list_per_page = 50
