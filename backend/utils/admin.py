from django.contrib import messages
from django.contrib.admin.utils import quote, unquote
from django.core.exceptions import PermissionDenied
from django.db.models import Q
from django.http import Http404, HttpResponseNotAllowed
from django.shortcuts import redirect
from django.urls import path, reverse


class SearchByIdAdminMixin:
    search_id_fields = ()

    def get_search_results(self, request, queryset, search_term):
        base_queryset = queryset
        queryset, may_have_duplicates = super().get_search_results(request, queryset, search_term)

        try:
            numeric_id = int(search_term)
        except (TypeError, ValueError):
            return queryset, may_have_duplicates

        id_query = Q()
        for field_name in self.search_id_fields:
            id_query |= Q(**{field_name: numeric_id})

        if id_query:
            queryset |= base_queryset.filter(id_query)

        return queryset, may_have_duplicates


class ForceRefreshAdminMixin:
    change_form_template = 'admin/force_refresh_change_form.html'
    force_refresh_label = 'Принудительно обновить'

    def get_urls(self):
        opts = self.model._meta
        custom_urls = [
            path(
                '<path:object_id>/force-refresh/',
                self.admin_site.admin_view(self.force_refresh_view),
                name=f'{opts.app_label}_{opts.model_name}_force_refresh',
            ),
        ]
        return custom_urls + super().get_urls()

    def render_change_form(self, request, context, add=False, change=False, form_url='', obj=None):
        if obj is not None and self.has_change_permission(request, obj):
            opts = self.model._meta
            context['force_refresh_url'] = reverse(
                f'admin:{opts.app_label}_{opts.model_name}_force_refresh',
                args=(quote(obj.pk),),
            )
            context['force_refresh_label'] = self.force_refresh_label

        return super().render_change_form(request, context, add, change, form_url, obj)

    def force_refresh_view(self, request, object_id):
        if request.method != 'POST':
            return HttpResponseNotAllowed(('POST',))

        obj = self.get_object(request, unquote(object_id))
        if obj is None:
            raise Http404
        if not self.has_change_permission(request, obj):
            raise PermissionDenied

        try:
            task = self.enqueue_force_refresh(obj)
        except Exception as error:
            self.message_user(
                request,
                f'Не удалось запустить обновление: {error}',
                level=messages.ERROR,
            )
        else:
            task_id = getattr(task, 'id', None)
            suffix = f' (задача {task_id})' if task_id else ''
            self.message_user(
                request,
                f'Принудительное обновление поставлено в очередь{suffix}.',
                level=messages.SUCCESS,
            )

        opts = self.model._meta
        return redirect(
            reverse(
                f'admin:{opts.app_label}_{opts.model_name}_change',
                args=(quote(obj.pk),),
            )
        )

    def enqueue_force_refresh(self, obj):
        raise NotImplementedError
