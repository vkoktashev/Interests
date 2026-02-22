from rest_framework_nested import routers

from shows.show_viewsets import ShowViewSet
from shows.episode_viewsets import EpisodeViewSet
from shows.season_viewsets import SeasonViewSet
from shows.search_viewsets import SearchShowsViewSet
from shows.trending_viewset import TrendingShowsViewSet
from shows.top_rated_viewset import TopRatedShowsViewSet

router = routers.DefaultRouter()
router.register('search', SearchShowsViewSet, basename='search')
router.register('show', ShowViewSet, basename='show')
router.register('trending', TrendingShowsViewSet, basename='trending')
router.register('top_rated', TopRatedShowsViewSet, basename='top-rated')

seasons_router = routers.NestedDefaultRouter(router, 'show', lookup='show')
seasons_router.register('season', SeasonViewSet, basename='season')

episodes_router = routers.NestedDefaultRouter(seasons_router, 'season', lookup='season')
episodes_router.register('episode', EpisodeViewSet, basename='episode')

urlpatterns = router.urls + seasons_router.urls + episodes_router.urls
