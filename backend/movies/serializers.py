from rest_framework import serializers

from movies.models import UserMovie


class UserMovieSerializer(serializers.ModelSerializer):
    status = serializers.CharField(source='get_status_display')

    class Meta:
        model = UserMovie
        fields = ('movie', 'status', 'user', 'score', 'review')
