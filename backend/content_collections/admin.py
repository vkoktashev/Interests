from django import forms
from django.contrib import admin

from utils.admin import SearchByIdAdminMixin
from .models import Collection, CollectionItemOrder
from .media import MEDIA_CONFIG
from .services.collections import _sync_collection_item_orders


class CollectionAdminForm(forms.ModelForm):
    class Meta:
        model = Collection
        fields = '__all__'
        labels = {
            'title': 'Название',
            'author': 'Автор',
            'privacy': 'Видимость',
            'display_mode': 'Отображение контента',
            'system_key': 'Ключ синхронизации',
            'games': 'Игры',
            'movies': 'Фильмы',
            'shows': 'Сериалы',
            'subscribers': 'Подписчики',
        }
        help_texts = {
            'author': 'Оставьте пустым для подборки редакции. Публичные подборки без автора отображаются на сайте в разделе редакции.',
            'system_key': 'Для автоматически обновляемых подборок. Для обычной подборки редакции оставьте пустым. Синхронизация может заменить её название и состав.',
        }


class CollectionTypeFilter(admin.SimpleListFilter):
    title = 'Тип подборки'
    parameter_name = 'collection_type'

    def lookups(self, request, model_admin):
        return (('editorial', 'Подборки редакции'), ('user', 'Пользовательские'))

    def queryset(self, request, queryset):
        if self.value() == 'editorial':
            return queryset.filter(author__isnull=True)
        if self.value() == 'user':
            return queryset.filter(author__isnull=False)
        return queryset


class CollectionItemCaptionInline(admin.TabularInline):
    model = CollectionItemOrder
    verbose_name = 'подпись к элементу'
    verbose_name_plural = 'Подписи к элементам (новые элементы появятся после сохранения)'
    fields = ('item_name', 'caption')
    readonly_fields = ('item_name',)
    extra = 0
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False

    @admin.display(description='Элемент')
    def item_name(self, obj):
        model, _ = MEDIA_CONFIG[obj.media_type]
        item = model.objects.filter(pk=obj.object_id).first()
        return str(item) if item else f'{obj.get_media_type_display()} #{obj.object_id}'


@admin.register(Collection)
class CollectionAdmin(SearchByIdAdminMixin, admin.ModelAdmin):
    form = CollectionAdminForm
    inlines = (CollectionItemCaptionInline,)
    list_display = ('id', 'title', 'collection_author', 'privacy', 'display_mode', 'updated_at')
    list_filter = (CollectionTypeFilter, 'privacy', 'display_mode', 'updated_at')
    search_fields = ('title', 'author__username', 'author__email', 'system_key')
    search_id_fields = ('pk', 'author_id')
    search_help_text = 'Название подборки, автор, email, ключ синхронизации или числовой ID'
    autocomplete_fields = ('author', 'games', 'movies', 'shows', 'subscribers')
    list_select_related = ('author',)
    ordering = ('-updated_at', '-id')
    list_per_page = 50
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {'fields': ('title', 'description', 'author', 'privacy', 'display_mode')}),
        ('Состав подборки', {'fields': ('movies', 'shows', 'games')}),
        ('Подписчики', {'fields': ('subscribers',), 'classes': ('collapse',)}),
        ('Синхронизация и даты', {
            'fields': ('system_key', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(description='Автор', ordering='author__username')
    def collection_author(self, obj):
        return obj.author.username if obj.author_id else 'Редакция Interests'

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        collection = form.instance
        for media_type, relation in (
            ('movie', collection.movies),
            ('show', collection.shows),
            ('game', collection.games),
        ):
            collection.item_orders.filter(media_type=media_type).exclude(
                object_id__in=relation.values('pk'),
            ).delete()
        _sync_collection_item_orders(collection)
