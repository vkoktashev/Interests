from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from users.models import User, UserFollow, UserLog
from utils.constants import USER_USERNAME_EXISTS, USER_EMAIL_EXISTS, USERNAME_CONTAINS_ILLEGAL_CHARACTERS

TYPE_USER = 'user'


class UserSerializer(serializers.ModelSerializer):
    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(USER_EMAIL_EXISTS)
        return value

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError(USER_USERNAME_EXISTS)
        if '@' in value:
            raise serializers.ValidationError(USERNAME_CONTAINS_ILLEGAL_CHARACTERS)
        return value

    def validate_password(self, value):
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


class UserFollowSerializer(serializers.ModelSerializer):
    def validate_followed_user(self, value):
        if value.pk is self.initial_data['user']:
            raise serializers.ValidationError('You can\'t follow yourself')

        return value

    class Meta:
        model = UserFollow
        exclude = ('id',)
        extra_kwargs = {
            'is_following': {'required': True},
            'user': {'write_only': True}
        }


class FollowedUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username')
        read_only_fields = ('id', 'username')


class UserLogSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField('get_username')
    user_id = serializers.SerializerMethodField('get_user_id')
    type = serializers.SerializerMethodField('get_type')
    target = serializers.SerializerMethodField('get_target')
    target_id = serializers.SerializerMethodField('get_target_id')

    def get_username(self, user_log):
        return user_log.user.username

    def get_user_id(self, user_log):
        return user_log.user.id

    def get_type(self, user_log):
        return TYPE_USER

    def get_target(self, user_log):
        return user_log.followed_user.username

    def get_target_id(self, user_log):
        return user_log.followed_user.id

    class Meta:
        model = UserLog
        exclude = ('followed_user',)


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token['username'] = user.username
        token['email'] = user.email

        return token
