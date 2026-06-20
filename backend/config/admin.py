from django.contrib import admin, messages
from django.contrib.admin.helpers import ACTION_CHECKBOX_NAME
from django.template.response import TemplateResponse
from django.utils import timezone

from .models import ScheduledTask
from .task_registry import enqueue_task, get_task_definition


@admin.register(ScheduledTask)
class ScheduledTaskAdmin(admin.ModelAdmin):
    list_display = (
        'task_name',
        'task_description',
        'task_schedule',
        'last_manual_run_at',
        'last_manual_run_by',
        'last_task_id',
    )
    readonly_fields = ('code', 'last_manual_run_at', 'last_manual_run_by', 'last_task_id')
    actions = ('run_selected_tasks',)
    list_select_related = ('last_manual_run_by',)
    ordering = ('code',)

    @admin.display(description='Задача', ordering='code')
    def task_name(self, obj):
        return get_task_definition(obj.code).get('name', obj.get_code_display())

    @admin.display(description='Описание')
    def task_description(self, obj):
        return get_task_definition(obj.code).get('description', '')

    @admin.display(description='Расписание')
    def task_schedule(self, obj):
        return get_task_definition(obj.code).get('schedule', '')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_actions(self, request):
        actions = super().get_actions(request)
        if not request.user.is_superuser:
            actions.pop('run_selected_tasks', None)
        return actions

    @admin.action(description='Запустить выбранные задачи')
    def run_selected_tasks(self, request, queryset):
        if not request.user.is_superuser:
            self.message_user(request, 'Ручной запуск доступен только суперпользователям.', messages.ERROR)
            return None

        if 'apply' not in request.POST:
            context = {
                **self.admin_site.each_context(request),
                'title': 'Подтверждение запуска фоновых задач',
                'queryset': queryset,
                'action_checkbox_name': ACTION_CHECKBOX_NAME,
                'opts': self.model._meta,
                'action_name': 'run_selected_tasks',
            }
            return TemplateResponse(
                request,
                'admin/config/scheduledtask/run_selected_confirmation.html',
                context,
            )

        launched_count = 0
        for scheduled_task in queryset:
            try:
                result = enqueue_task(scheduled_task.code)
            except Exception as error:
                self.message_user(
                    request,
                    f'Не удалось запустить «{scheduled_task}»: {error}',
                    messages.ERROR,
                )
                continue

            scheduled_task.last_manual_run_at = timezone.now()
            scheduled_task.last_manual_run_by = request.user
            scheduled_task.last_task_id = result.id or ''
            scheduled_task.save(update_fields=(
                'last_manual_run_at',
                'last_manual_run_by',
                'last_task_id',
            ))
            launched_count += 1

        if launched_count:
            self.message_user(request, f'Задач поставлено в очередь: {launched_count}', messages.SUCCESS)

        return None
