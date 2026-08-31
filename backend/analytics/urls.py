from django.urls import path

from analytics.views import TopPersonalitiesView, UserAnalyticsView


app_name = 'analytics'

urlpatterns = [
    path('users/<str:user_id>/stats/', UserAnalyticsView.as_view(), name='user-stats'),
    path(
        'users/<str:user_id>/top-personalities/',
        TopPersonalitiesView.as_view(),
        name='top-personalities',
    ),
]

