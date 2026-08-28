from rest_framework import routers

from .viewsets import CollectionViewSet


router = routers.DefaultRouter()
router.register('', CollectionViewSet, basename='collection')

urlpatterns = router.urls
