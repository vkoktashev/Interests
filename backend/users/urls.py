from django.urls import path
from rest_framework import routers
from rest_framework_simplejwt.views import TokenRefreshView

from users.viewsets import AuthViewSet, UserViewSet, MyTokenObtainPairView

router = routers.DefaultRouter()
router.register('auth', AuthViewSet, basename='auth')
router.register('user', UserViewSet, basename='user')

urlpatterns = [
    path('auth/login/', MyTokenObtainPairView.as_view()),
    path('auth/refresh-token/', TokenRefreshView.as_view()),
    # path('auth/password/change'),
    # path('auth/password/restore'),
]

urlpatterns += router.urls
