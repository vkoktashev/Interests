from django.urls import path

from games.views import search, get_game

urlpatterns = [
    path('game/<str:slug>', get_game),
    path('search', search),
]
