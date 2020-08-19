from rest_framework import serializers

from games.models import UserGame


class UserGameSerializer(serializers.ModelSerializer):
    status = serializers.CharField(source='get_status_display')

    class Meta:
        model = UserGame
        fields = ('game', 'status', 'user', 'score', 'review')
