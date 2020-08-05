from django.db import models
from django.contrib.auth import get_user_model


# Create your models here.
class MapData(models.Model):
    id = models.AutoField(primary_key=True)
    ReformaID = models.IntegerField(null=True)
    ReformaAddress = models.CharField(max_length=150, default=None)
    city = models.CharField(max_length=30, null=True)
    # url = models.Field()
    lat = models.FloatField(null=True)
    lng = models.FloatField(null=True)
    HouseWarningType = models.IntegerField(null=True)
    CountALL = models.IntegerField(null=True)
    CountLiv = models.IntegerField(null=True)
    CountUnLiv = models.IntegerField(null=True)
    creator = models.ForeignKey(get_user_model(), related_name='houses', on_delete=models.CASCADE)
    createTime = models.DateTimeField(auto_now_add=True, null=True)


class Movie(models.Model):
    id = models.AutoField(primary_key=True)
