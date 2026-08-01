from rest_framework import serializers

from people.models import PersonLog
from utils.constants import TYPE_PERSON


class PersonLogSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField('get_username')
    user_id = serializers.SerializerMethodField('get_user_id')
    user_gender = serializers.SerializerMethodField('get_user_gender')
    type = serializers.SerializerMethodField('get_type')
    target = serializers.SerializerMethodField('get_target')
    target_id = serializers.SerializerMethodField('get_target_id')

    @staticmethod
    def get_username(person_log):
        return person_log.user.username

    @staticmethod
    def get_user_id(person_log):
        return person_log.user.id

    @staticmethod
    def get_user_gender(person_log):
        return person_log.user.gender

    @staticmethod
    def get_type(person_log):
        return TYPE_PERSON

    @staticmethod
    def get_target(person_log):
        return person_log.person.name

    @staticmethod
    def get_target_id(person_log):
        return person_log.person.id

    class Meta:
        model = PersonLog
        exclude = ('person',)
