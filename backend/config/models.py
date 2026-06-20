from django.conf import settings
from django.db import models


class ScheduledTask(models.Model):
    UPDATE_UPCOMING_GAMES = 'update_upcoming_games'
    UPDATE_UPCOMING_MOVIES = 'update_upcoming_movies'
    UPDATE_SHOWS = 'update_shows'
    SEND_RELEASE_EMAILS = 'send_release_emails'

    TASK_CHOICES = (
        (UPDATE_UPCOMING_GAMES, 'Обновление будущих игр'),
        (UPDATE_UPCOMING_MOVIES, 'Обновление будущих фильмов'),
        (UPDATE_SHOWS, 'Обновление сериалов'),
        (SEND_RELEASE_EMAILS, 'Рассылка уведомлений о релизах'),
    )

    code = models.CharField(max_length=64, unique=True, choices=TASK_CHOICES)
    last_manual_run_at = models.DateTimeField(null=True, blank=True)
    last_manual_run_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
    )
    last_task_id = models.CharField(max_length=64, blank=True)

    class Meta:
        verbose_name = 'фоновая задача'
        verbose_name_plural = 'фоновые задачи'
        ordering = ('code',)

    def __str__(self):
        return self.get_code_display()
