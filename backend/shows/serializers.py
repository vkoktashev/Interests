from rest_framework import serializers

from shows.models import UserShow
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
