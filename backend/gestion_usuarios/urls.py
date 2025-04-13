from django.urls import path, include
from rest_framework.routers import DefaultRouter
from gestion_usuarios.views.user_views import UsuarioViewSet, \
    LoginView, MeView, UserPermissionsView, ChangePasswordView, \
    CustomTokenRefreshView, RegistroActividadViewSet, LogoutView

router = DefaultRouter()
router.register(r'users', UsuarioViewSet, basename='users')
router.register(r'actividad', RegistroActividadViewSet, basename='actividad')

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('me/', MeView.as_view(), name='me'),
    path("logout/", LogoutView.as_view(), name="logout"),
    path('me/permissions/', UserPermissionsView.as_view(), name='me-permissions'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('api/token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),

    path('', include(router.urls)),
]
