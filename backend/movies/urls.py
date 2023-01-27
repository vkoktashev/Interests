from rest_framework import routers

from movies.search_viewset import SearchMoviesViewSet
from movies.movie_viewset import MovieViewSet

router = routers.DefaultRouter()
router.register('search', SearchMoviesViewSet, basename='search')
router.register('movie', MovieViewSet, basename='movie')

urlpatterns = router.urls
