from adrf.fields import SerializerMethodField
from adrf.serializers import ModelSerializer
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer

from games.models import Game
from movies.models import Movie
from shows.models import Show
from users.models import User, UserFollow, UserLog
from utils.constants import USER_USERNAME_EXISTS, USER_EMAIL_EXISTS, USERNAME_CONTAINS_ILLEGAL_CHARACTERS, \
    WRONG_BACKDROP_PATH, TYPE_USER
from utils.serializers import ChoicesField


class UserSerializer(ModelSerializer):
    @staticmethod
    def validate_email(value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(USER_EMAIL_EXISTS)
        return value

    @staticmethod
    def validate_username(value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError(USER_USERNAME_EXISTS)
        if '@' in value:
            raise serializers.ValidationError(USERNAME_CONTAINS_ILLEGAL_CHARACTERS)
        return value

    @staticmethod
    def validate_password(value):
        validate_password(value)
        return value

    def create(self, validated_data):
        validated_data['password'] = make_password(validated_data.get('password'))
        return super(UserSerializer, self).create(validated_data)

    def update(self, instance, validated_data):
        validated_data['password'] = make_password(validated_data.get('password'))
        return super(UserSerializer, self).update(instance, validated_data)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'write_only': True},
        }


class UserFollowSerializer(ModelSerializer):
    def validate_followed_user(self, value):
        if value.pk == self.initial_data['user']:
            raise serializers.ValidationError('You can\'t follow yourself')

        return value

    class Meta:
        model = UserFollow
        exclude = ('id',)
        extra_kwargs = {
            'is_following': {'required': True},
            'user': {'write_only': True}
        }


class FollowedUserSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username')
        read_only_fields = ('id', 'username')


class UserLogSerializer(ModelSerializer):
    user = SerializerMethodField('get_username')
    user_id = SerializerMethodField('get_user_id')
    type = SerializerMethodField('get_type')
    target = SerializerMethodField('get_target')
    target_id = SerializerMethodField('get_target_id')

    @staticmethod
    def get_username(user_log):
        return user_log.user.username

    @staticmethod
    def get_user_id(user_log):
        return user_log.user.id

    @staticmethod
    def get_type(user_log):
        return TYPE_USER

    @staticmethod
    def get_target(user_log):
        return user_log.followed_user.username

    @staticmethod
    def get_target_id(user_log):
        return user_log.followed_user.id

    class Meta:
        model = UserLog
        exclude = ('followed_user',)


class SettingsSerializer(ModelSerializer):
    privacy = ChoicesField(choices=User.PRIVACY_CHOICES, required=False)

    @staticmethod
    def validate_backdrop_path(value):
        if not (Game.objects.filter(rawg_backdrop_path=value).exists() or
                Movie.objects.filter(tmdb_backdrop_path=value).exists() or
                Show.objects.filter(tmdb_backdrop_path=value).exists()):
            raise serializers.ValidationError(WRONG_BACKDROP_PATH)
        return value

    class Meta:
        model = User
        fields = ('receive_games_releases', 'receive_movies_releases',
                  'receive_episodes_releases', 'backdrop_path', 'privacy')


class UserInfoSerializer(ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'last_activity', 'backdrop_path')


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    default_error_messages = {
        'no_active_account': _('Неверный логин или пароль.')
    }

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token['username'] = user.username
        token['email'] = user.email

        return token


class MyTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        result = {"accessToken": data["access"]}
        if "refresh" in data:
            result["refreshToken"] = data["refresh"]

        return result
