from django.urls import path

from games.views import search, set_score, set_review, set_status, get_game, set_time

urlpatterns = [
    path('game/<str:slug>', get_game),
    path('game/<str:slug>/set-status', set_status),
    path('game/<str:slug>/set-score', set_score),
    path('game/<str:slug>/set-review', set_review),
    path('game/<str:slug>/set-time', set_time),
    path('search', search),
]
