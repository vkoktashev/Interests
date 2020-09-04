from rest_framework import routers

from games.viewsets import SearchGamesViewSet, GameViewSet

router = routers.DefaultRouter()
router.register('search', SearchGamesViewSet, basename='search')
router.register('game', GameViewSet, basename='game')

urlpatterns = router.urls
