from rest_framework_nested import routers

from shows.show_viewset import ShowViewSet
from shows.episode_viewset import EpisodeViewSet
from shows.season_viewset import SeasonViewSet
from shows.search_viewset import SearchShowsViewSet

router = routers.DefaultRouter()
router.register('search', SearchShowsViewSet, basename='search')
router.register('show', ShowViewSet, basename='show')

seasons_router = routers.NestedDefaultRouter(router, 'show', lookup='show')
seasons_router.register('season', SeasonViewSet, basename='season')

episodes_router = routers.NestedDefaultRouter(seasons_router, 'season', lookup='season')
episodes_router.register('episode', EpisodeViewSet, basename='episode')

urlpatterns = router.urls + seasons_router.urls + episodes_router.urls
