from rest_framework.response import Response
from rest_framework.views import APIView

from .models import MapData
from .serializers import HomesSerializers
from django.contrib.auth import get_user_model
import json
from django.http import Http404
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import parser_classes
from django.http import FileResponse, HttpResponse


class MapdataView(APIView):
    def get(self, request, city):
        try:
            homes = MapData.objects.filter(city=city).all()  # [:1000]
        except MapData.DoesNotExist:
            homes = None
        serializer = HomesSerializers(homes, many=True)
        return Response({"homes": serializer.data})

    def post(self, request, ):
        serializer = HomesSerializers(data=request.data)
        print(serializer)
        if serializer.is_valid():
            serializer.save(creator=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, id):
        home = MapData.objects.get(id=id)
        serializer = HomesSerializers(home, data=request.data,
                                      partial=True)  # set partial=True to update a data partially
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, id):
        try:
            MapData.objects.filter(id=id).delete()
        except MapData.DoesNotExist:
            Response(status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_201_CREATED)
