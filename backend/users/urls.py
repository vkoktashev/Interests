from django.urls import path
from rest_framework import routers
from rest_framework_simplejwt.views import TokenRefreshView

from users.viewsets import AuthViewSet, UserViewSet, MyTokenObtainPairView, SearchUsersViewSet

router = routers.DefaultRouter()
router.register('auth', AuthViewSet, basename='auth')
router.register('user', UserViewSet, basename='user')
router.register('search', SearchUsersViewSet, basename='search')

urlpatterns = [
    path('auth/login/', MyTokenObtainPairView.as_view()),
    path('auth/refresh-token/', TokenRefreshView.as_view()),
    # path('auth/password/change'),
    # path('auth/password/restore'),
]

urlpatterns += router.urls
