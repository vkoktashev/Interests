from rest_framework import routers

from games.viewsets import SearchGamesViewSet, GameViewSet
from games.top_rated_viewset import TopRatedGamesViewSet

router = routers.DefaultRouter()
router.register('search', SearchGamesViewSet, basename='search')
router.register('game', GameViewSet, basename='game')
router.register('top_rated', TopRatedGamesViewSet, basename='top-rated')

urlpatterns = router.urls
