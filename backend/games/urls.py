from django.urls import path

from games.views import search, get_game

urlpatterns = [
    path('game', get_game),
    path('search', search),
]
