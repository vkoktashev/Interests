from django.contrib import admin, messages
from django.contrib.admin.helpers import ACTION_CHECKBOX_NAME
from django.template.response import TemplateResponse
from django.utils import timezone

from .celery import app as celery_app
from .models import ScheduledTask
from .task_registry import enqueue_task, get_task_definition


@admin.register(ScheduledTask)
class ScheduledTaskAdmin(admin.ModelAdmin):
    list_display = (
        'task_name',
        'task_description',
        'task_schedule',
        'task_status',
        'task_progress',
        'task_result_summary',
        'last_manual_run_at',
        'last_manual_run_by',
        'last_task_id',
    )
    readonly_fields = (
        'code',
        'task_status',
        'task_progress',
        'task_result_summary',
        'last_manual_run_at',
        'last_manual_run_by',
        'last_task_id',
    )
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

    @admin.display(description='Статус последнего запуска')
    def task_status(self, obj):
        if not obj.last_task_id:
            return 'Не запускалась'

        meta = self.get_last_task_meta(obj)
        status = meta.get('status')
        result = meta.get('result')

        if status == 'SUCCESS' and isinstance(result, dict) and result.get('errors'):
            return 'Завершено с ошибками'

        return {
            'PENDING': 'В очереди / статус недоступен',
            'RECEIVED': 'Получена worker-ом',
            'STARTED': 'Запущена',
            'PROGRESS': 'Выполняется',
            'SUCCESS': 'Завершена',
            'FAILURE': 'Ошибка',
            'RETRY': 'Повторная попытка',
            'REVOKED': 'Отменена',
            'BACKEND_UNAVAILABLE': 'Статус недоступен',
        }.get(status, status or 'Неизвестно')

    @admin.display(description='Прогресс')
    def task_progress(self, obj):
        if not obj.last_task_id:
            return '—'

        meta = self.get_last_task_meta(obj)
        result = meta.get('result')
        if not isinstance(result, dict):
            return '—'

        current = result.get('current')
        total = result.get('total')
        if not isinstance(current, int) or not isinstance(total, int):
            return '—'

        percent = round(current * 100 / total) if total else 100
        progress = f'{current} / {total} ({percent}%)'
        current_show = result.get('current_show')
        if meta.get('status') == 'PROGRESS' and current_show:
            progress = f'{progress} — {current_show}'
        return progress

    @admin.display(description='Результат')
    def task_result_summary(self, obj):
        if not obj.last_task_id:
            return '—'

        meta = self.get_last_task_meta(obj)
        result = meta.get('result')
        status = meta.get('status')
        if status == 'BACKEND_UNAVAILABLE':
            return str(result)
        if status == 'FAILURE':
            return f'Ошибка: {result}'
        if not isinstance(result, dict):
            return '—'

        updated = result.get('updated')
        errors = result.get('errors')
        parts = []
        if isinstance(updated, int):
            parts.append(f'обновлено: {updated}')
        if isinstance(errors, int):
            parts.append(f'ошибок: {errors}')

        duration = result.get('duration_seconds')
        if isinstance(duration, (int, float)):
            parts.append(f'время: {duration:.1f} с')
        return ', '.join(parts) or '—'

    def get_last_task_meta(self, obj):
        cached_meta = getattr(obj, '_last_task_meta', None)
        if cached_meta is not None:
            return cached_meta

        try:
            meta = celery_app.backend.get_task_meta(obj.last_task_id)
        except Exception as error:
            meta = {
                'status': 'BACKEND_UNAVAILABLE',
                'result': f'Не удалось получить состояние Celery: {error}',
            }
        obj._last_task_meta = meta
        return meta

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
