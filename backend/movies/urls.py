from rest_framework import routers

from movies.search_viewset import SearchMoviesViewSet
from movies.movie_viewset import MovieViewSet
from movies.trending_viewset import TrendingMoviesViewSet
from movies.top_rated_viewset import TopRatedMoviesViewSet

router = routers.DefaultRouter()
router.register('search', SearchMoviesViewSet, basename='search')
router.register('movie', MovieViewSet, basename='movie')
router.register('trending', TrendingMoviesViewSet, basename='trending')
router.register('top_rated', TopRatedMoviesViewSet, basename='top-rated')

urlpatterns = router.urls
