import requests
from django.http import HttpResponse
from requests.exceptions import MissingSchema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet


class ProxyViewSet(GenericViewSet):
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def image(self, request):
        url = request.GET.get('url')
        try:
            res = requests.get(url)
        except MissingSchema:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        if res.status_code == 200:
            return HttpResponse(res.content, content_type='image/jpeg')

        return Response(status=res.status_code)
