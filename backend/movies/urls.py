from rest_framework import routers

from movies.viewsets import SearchMoviesViewSet, MovieViewSet

router = routers.DefaultRouter()
router.register('search', SearchMoviesViewSet, basename='search')
router.register('movie', MovieViewSet, basename='movie')

urlpatterns = router.urls
