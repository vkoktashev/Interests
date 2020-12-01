from django.contrib.auth.hashers import make_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from users.models import User, UserFollow


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')
        extra_kwargs = {
            'password': {'write_only': True},
        }

    def create(self, validated_data):
        validated_data['password'] = make_password(validated_data.get('password'))
        return super(UserSerializer, self).create(validated_data)


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


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token['username'] = user.username
        token['email'] = user.email

        return token
