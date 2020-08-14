from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from users.views import signup, confirmation, get_log

urlpatterns = [
    path('auth/signup', signup),
    path('auth/login', TokenObtainPairView.as_view()),
    path('auth/refresh-token', TokenRefreshView.as_view()),
    # path('auth/password/change'),
    # path('auth/password/restore'),
    path('auth/confirm-email/<str:uid64>/<str:token>', confirmation),
    path('log', get_log)
]
