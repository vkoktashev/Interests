from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import PermissionsMixin
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from utils.constants import USER_EMAIL_EXISTS, USER_USERNAME_EXISTS
from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    username_validator = UnicodeUsernameValidator()

    username = models.CharField(
        _('username'),
        max_length=150,
        unique=True,
        validators=[username_validator],
        error_messages={
            'unique': _(USER_USERNAME_EXISTS),
        },
    )
    email = models.EmailField(_('email address'), unique=True, error_messages={
        'unique': _(USER_EMAIL_EXISTS),
    }, )
    is_active = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    is_staff = models.BooleanField(_('staff status'), default=False)
    last_activity = models.DateTimeField(default=timezone.now)
    receive_games_releases = models.BooleanField(default=False)
    receive_movies_releases = models.BooleanField(default=False)
    receive_episodes_releases = models.BooleanField(default=False)
    backdrop_path = models.CharField(max_length=200, null=True)

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []

    objects = UserManager()

    def __str__(self):
        return self.username


class UserScore(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    score = models.IntegerField(validators=[MinValueValidator(0), MaxValueValidator(10)], default=0)
    review = models.CharField(max_length=3000, blank=True)

    class Meta:
        abstract = True


class UserLogAbstract(models.Model):
    ACTION_TYPE_SCORE = 'score'
    ACTION_TYPE_REVIEW = 'review'
    ACTION_TYPE_STATUS = 'status'
    ACTION_TYPE_TIME = 'spent_time'

    ACTION_TYPE_CHOICES = (
        (ACTION_TYPE_SCORE, 'Score changed'),
        (ACTION_TYPE_REVIEW, 'Review changed'),
        (ACTION_TYPE_STATUS, 'Status changed'),
        (ACTION_TYPE_TIME, 'Spent time changed'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created = models.DateTimeField(default=timezone.now)
    action_result = models.CharField(max_length=3000)
    action_type = models.CharField(max_length=30, choices=ACTION_TYPE_CHOICES)

    class Meta:
        abstract = True


class UserLog(models.Model):
    ACTION_TYPE_FOLLOW = 'is_following'

    ACTION_TYPE_CHOICES = (
        (ACTION_TYPE_FOLLOW, 'Follow status changed'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created = models.DateTimeField(default=timezone.now)
    action_result = models.CharField(max_length=300)
    action_type = models.CharField(max_length=30, choices=ACTION_TYPE_CHOICES)
    followed_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followed_user')


class UserFollow(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user')
    followed_user = models.ForeignKey(User, on_delete=models.CASCADE)
    is_following = models.BooleanField(default=True)

    class Meta:
        unique_together = (("user", "followed_user"),)


class UserPasswordToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    reset_token = models.CharField(max_length=500, unique=True)
    is_active = models.BooleanField(default=True)
