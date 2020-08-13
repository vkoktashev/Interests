from rest_framework import serializers

from games.models import UserGame


class UserGameScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserGame
        fields = '__all__'
