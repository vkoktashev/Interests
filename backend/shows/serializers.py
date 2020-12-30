from rest_framework import serializers

from shows.models import UserShow, UserSeason, UserEpisode
from utils.serializers import ChoicesField

TYPE_MOVIE = 'show'


class UserShowSerializer(serializers.ModelSerializer):
    status = ChoicesField(choices=UserShow.STATUS_CHOICES, required=False)

    class Meta:
        model = UserShow
        exclude = ('id', 'updated_at')
        extra_kwargs = {
            'user': {'write_only': True},
            'show': {'write_only': True}
        }


class UserSeasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSeason
        exclude = ('id', 'updated_at')
        extra_kwargs = {
            'user': {'write_only': True},
            'season': {'write_only': True}
        }


class UserEpisodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserEpisode
        exclude = ('id', 'updated_at')
        extra_kwargs = {
            'user': {'write_only': True},
            'episode': {'write_only': True}
        }
