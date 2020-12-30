from rest_framework import routers

from shows.viewsets import SearchShowsViewSet, ShowViewSet

router = routers.DefaultRouter()
router.register('search', SearchShowsViewSet, basename='search')
router.register('show', ShowViewSet, basename='show')

urlpatterns = router.urls
