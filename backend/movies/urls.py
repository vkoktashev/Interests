from django.urls import path

from movies.views import search, get_movie

urlpatterns = [
    path('movie/<int:movie_id>', get_movie),
    # path('game/<str:slug>/set-status', set_status),
    # path('game/<str:slug>/set-score', set_score),
    # path('game/<str:slug>/set-review', set_review),
    path('search', search),
]