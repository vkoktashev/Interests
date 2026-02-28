from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from rest_framework import permissions

from utils.swagger import openapi, get_schema_view, swagger_available

urlpatterns = [
    path('admin/', admin.site.urls),
    path('users/', include('users.urls')),
    path('games/', include('games.urls')),
    path('movies/', include('movies.urls')),
    path('shows/', include('shows.urls')),
    path('', include('proxy.urls')),
    path('', include('general.urls')),
]

if swagger_available:
    schema_view = get_schema_view(
        openapi.Info(
            title="Interests API",
            default_version='v2',
        ),
        public=True,
        permission_classes=(permissions.AllowAny,),
        authentication_classes=[],
    )
    urlpatterns.insert(1, path('api/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'))

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

if settings.DEBUG:
    urlpatterns += [
        path('debug/', include('debug_toolbar.urls')),
    ]
