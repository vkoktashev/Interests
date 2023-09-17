from rest_framework import routers

from general.viewsets import GeneralViewSet

router = routers.DefaultRouter()
router.register('', GeneralViewSet, basename='general')

urlpatterns = [
]

urlpatterns += router.urls
