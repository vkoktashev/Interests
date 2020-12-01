from rest_framework import serializers


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
