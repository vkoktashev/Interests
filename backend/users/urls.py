from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from users.views import signup, confirmation, get_log, get_user, MyTokenObtainPairView

urlpatterns = [
    path('auth/signup', signup),
    path('auth/login', MyTokenObtainPairView.as_view()),
    path('auth/refresh-token', TokenRefreshView.as_view()),
    # path('auth/password/change'),
    # path('auth/password/restore'),
    path('auth/confirm-email/<str:uid64>/<str:token>', confirmation),
    path('user/<int:user_id>', get_user),
    path('log', get_log)
]
