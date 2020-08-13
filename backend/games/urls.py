from django.urls import path

from games.views import search, get_game, set_score, set_review, set_status

urlpatterns = [
    path('game/<str:slug>', get_game),
    path('game/<str:slug>/set-status', set_status),
    path('game/<str:slug>/set-score', set_score),
    path('game/<str:slug>/set-review', set_review),
    path('search', search),
]
