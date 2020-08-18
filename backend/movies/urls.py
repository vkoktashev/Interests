from django.urls import path

from movies.views import search

urlpatterns = [
    # path('game/<str:slug>', get_movie),
    # path('game/<str:slug>/set-status', set_status),
    # path('game/<str:slug>/set-score', set_score),
    # path('game/<str:slug>/set-review', set_review),
    path('search', search),
]