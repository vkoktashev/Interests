from rest_framework import routers
from django.urls import path

from general.viewsets import GeneralViewSet

router = routers.DefaultRouter()
router.register('', GeneralViewSet, basename='general')

urlpatterns = [
    path(
        'init',
        GeneralViewSet.as_view({'get': 'init', 'post': 'init'}),
        name='general-init-no-slash',
    ),
    path(
        'init/',
        GeneralViewSet.as_view({'get': 'init', 'post': 'init'}),
        name='general-init',
    ),
]

urlpatterns += router.urls
