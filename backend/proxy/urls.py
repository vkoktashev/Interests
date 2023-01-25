from rest_framework import routers

from proxy.viewsets import ProxyViewSet

router = routers.DefaultRouter()
router.register('proxy', ProxyViewSet, basename='proxy')

urlpatterns = router.urls
