from rest_framework import routers

from people.search_viewset import SearchPeopleViewSet
from people.viewsets import PersonViewSet

router = routers.DefaultRouter()
router.register('search', SearchPeopleViewSet, basename='search')
router.register('person', PersonViewSet, basename='person')

urlpatterns = router.urls
