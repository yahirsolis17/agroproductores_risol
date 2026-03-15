from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import views as auth_views
from rest_framework_simplejwt.views import TokenVerifyView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from django.conf import settings
from django.conf.urls.static import static
from gestion_usuarios.views.user_views import CustomTokenRefreshView, LoginView, TokenPairBridgeView

urlpatterns = [
    path('admin/', admin.site.urls),

    # Autenticación clásica
    path('accounts/', include('django.contrib.auth.urls')),
    path('accounts/login/', auth_views.LoginView.as_view(), name='login'),

    # JWT
    path('api/token/', TokenPairBridgeView.as_view(), name='token_obtain_pair'),
    path('api/login/', LoginView.as_view(), name='api_login'),
    path('api/token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),

    # Módulos
    path('huerta/', include(('gestion_huerta.urls', 'gestion_huerta'), namespace='huerta')),
    path('bodega/', include(('gestion_bodega.urls', 'gestion_bodega'), namespace='bodega')),
    path('gestion-bodega/', include(('gestion_bodega.urls', 'gestion_bodega'), namespace='gestion_bodega')),
    path('usuarios/', include(('gestion_usuarios.urls', 'gestion_usuarios'), namespace='gestion_usuarios')),

    # Documentación DRF Spectacular
]

if settings.ENABLE_API_DOCS:
    urlpatterns += [
        path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
        path('api/docs/swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
        path('api/docs/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    ]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
