from rest_framework import serializers

from games.models import UserGame


class ChoicesField(serializers.Field):
    def __init__(self, choices, **kwargs):
        self._choices = choices
        super(ChoicesField, self).__init__(**kwargs)

    def to_representation(self, obj):
        for choice in self._choices:
            if obj in choice:
                return choice[1]

    def to_internal_value(self, data):
        for choice in self._choices:
            if data in choice:
                return choice[0]
        raise serializers.ValidationError(f'Choice should be one of {self._choices}')


class UserGameSerializer(serializers.ModelSerializer):
    status = ChoicesField(choices=UserGame.STATUS_CHOICES, required=False)

    class Meta:
        model = UserGame
        fields = '__all__'


class UserGameRawgSerializer(UserGameSerializer):
    game = serializers.DictField(source='get_rawg_game')

    class Meta:
        model = UserGame
        fields = ('game', 'status', 'score', 'review', 'spent_time')
