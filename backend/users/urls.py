from django.urls import path
from rest_framework import routers
from rest_framework_simplejwt.views import TokenRefreshView

from users.viewsets import UserViewSet, MyTokenRefreshView
from users.search_viewsets import SearchUsersViewSet
from users.auth_viewsets import AuthViewSet, MyTokenObtainPairView, TelegramWebhookView

router = routers.DefaultRouter()
router.register('auth', AuthViewSet, basename='auth')
router.register('user', UserViewSet, basename='user')
router.register('search', SearchUsersViewSet, basename='search')

urlpatterns = [
    path('auth/login/', MyTokenObtainPairView.as_view()),
    path('auth/refresh-token/', MyTokenRefreshView.as_view()),
    path('telegram/webhook/', TelegramWebhookView.as_view()),
    # path('auth/password/change')
]

urlpatterns += router.urls
