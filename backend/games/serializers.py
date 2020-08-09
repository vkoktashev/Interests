from rest_framework import serializers

from games.models import UserGameScore


class UserGameScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserGameScore
        fields = '__all__'
