from rest_framework import serializers

from games.models import UserGame


class UserGameSerializer(serializers.ModelSerializer):
    status = serializers.CharField(source='get_status_display')

    class Meta:
        model = UserGame
        fields = ('status', 'score', 'review', 'spent_time')


class UserGameRawgSerializer(UserGameSerializer):
    game = serializers.DictField(source='get_rawg_game')

    class Meta:
        model = UserGame
        fields = ('game', 'status', 'score', 'review', 'spent_time')
