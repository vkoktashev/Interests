from django.urls import path

from games.views import search, get_game, set_score, set_review

urlpatterns = [
    path('game/<str:slug>', get_game),
    path('set-score', set_score),
    path('set-review', set_review),
    path('search', search),
]
