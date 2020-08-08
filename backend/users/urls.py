from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import UserView, EmailView

urlpatterns = [
    path('auth/signup/', UserView.as_view()),
    path('auth/login/', TokenObtainPairView.as_view()),
    path('auth/refresh-token/', TokenRefreshView.as_view()),
    # path('auth/password/change/'),
    # path('auth/password/restore/'),
    path('auth/confirm-email/<str:uid64>/<str:token>/', EmailView.as_view()),
]
