from rest_framework import serializers

from .models import MapData


class HomesSerializers(serializers.ModelSerializer):
    class Meta:
        model = MapData
        fields = (
            'ReformaID', 'ReformaAddress', 'lng', 'lat', 'HouseWarningType', 'CountALL', 'CountLiv', 'CountUnLiv',
            'city',
            'id')

    def create(self, validated_data):
        return MapData.objects.create(**validated_data)
