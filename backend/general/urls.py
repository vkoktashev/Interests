from rest_framework import routers
from django.urls import path
from rest_framework.permissions import AllowAny

from general.viewsets import GeneralViewSet

router = routers.DefaultRouter()
router.register('', GeneralViewSet, basename='general')

urlpatterns = [
    path(
        'init',
        GeneralViewSet.as_view(
            {'get': 'init', 'post': 'init'},
            authentication_classes=[],
            permission_classes=[AllowAny],
        ),
        name='general-init-no-slash',
    ),
    path(
        'init/',
        GeneralViewSet.as_view(
            {'get': 'init', 'post': 'init'},
            authentication_classes=[],
            permission_classes=[AllowAny],
        ),
        name='general-init',
    ),
]

urlpatterns += router.urls
