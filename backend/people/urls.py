from rest_framework import routers

from people.viewsets import PersonViewSet

router = routers.DefaultRouter()
router.register('person', PersonViewSet, basename='person')

urlpatterns = router.urls
