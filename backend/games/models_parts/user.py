from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from games.models_parts.game import Game
from users.models import UserScore, UserLogAbstract


class UserGame(UserScore):
    STATUS_PLAYING = 'playing'
    STATUS_COMPLETED = 'completed'
    STATUS_STOPPED = 'stopped'
    STATUS_GOING = 'going'
    STATUS_NOT_PLAYED = 'not played'

    STATUS_CHOICES = (
        (STATUS_PLAYING, 'Играю'),
        (STATUS_COMPLETED, 'Прошел'),
        (STATUS_STOPPED, 'Дропнул'),
        (STATUS_GOING, 'Буду играть'),
        (STATUS_NOT_PLAYED, 'Не играл')
    )

    game = models.ForeignKey(Game, on_delete=models.PROTECT)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_NOT_PLAYED)
    spent_time = models.DecimalField(validators=[MinValueValidator(0.0)], default=0.0, max_digits=7, decimal_places=1)
    updated_at = models.DateTimeField(null=False, default=timezone.now)

    class Meta:
        unique_together = (("user", "game"),)
        indexes = (
            models.Index(fields=('user', 'status'), name='ugame_user_status_idx'),
            models.Index(fields=('user', '-updated_at'), name='ugame_user_updated_idx'),
        )
        constraints = (
            models.CheckConstraint(
                condition=models.Q(score__gte=0, score__lte=10),
                name='user_game_score_between_0_and_10',
            ),
            models.CheckConstraint(
                condition=models.Q(spent_time__gte=0),
                name='user_game_spent_time_nonnegative',
            ),
        )
        verbose_name = 'игра пользователя'
        verbose_name_plural = 'игры пользователей'


class GameLog(UserLogAbstract):
    game = models.ForeignKey(Game, on_delete=models.PROTECT)

    class Meta:
        indexes = (
            models.Index(fields=('user', '-created'), name='glog_user_created_idx'),
            models.Index(
                fields=('user', 'action_type', '-created'),
                name='glog_user_type_created_idx',
            ),
        )
        verbose_name = 'лог игры'
        verbose_name_plural = 'логи игр'
