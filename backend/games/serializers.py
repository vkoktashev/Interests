from rest_framework import serializers

from games.models import UserGame, Game


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


class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        exclude = ('id',)


class UserGameSerializer(serializers.ModelSerializer):
    status = ChoicesField(choices=UserGame.STATUS_CHOICES, required=False)

    class Meta:
        model = UserGame
        exclude = ('id',)
        extra_kwargs = {
            'user': {'write_only': True},
            'game': {'write_only': True}
        }


class ExtendedUserGameSerializer(UserGameSerializer):
    game = GameSerializer()

    class Meta:
        model = UserGame
        exclude = ('id', 'user')
