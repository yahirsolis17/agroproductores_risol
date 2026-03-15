from django.urls import path, include
from rest_framework.routers import DefaultRouter
from gestion_usuarios.views.user_views import UsuarioViewSet, \
    LoginView, MeView, UserPermissionsView, ChangePasswordView, \
    CustomTokenRefreshView, RegistroActividadViewSet, LogoutView, PermisoViewSet, PermisosFiltradosView
from gestion_usuarios.views.dashboard_views import DashboardOverviewView, DashboardSearchView

router = DefaultRouter()
router.register(r'users',      UsuarioViewSet,      basename='users')
router.register(r'actividad',  RegistroActividadViewSet, basename='actividad')
router.register(r'permisos',  PermisoViewSet,           basename='permisos')  # ← y esto

app_name = 'gestion_usuarios'
urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('me/', MeView.as_view(), name='me'),
    path("logout/", LogoutView.as_view(), name="logout"),
    path('me/permissions/', UserPermissionsView.as_view(), name='me-permissions'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('api/token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('dashboard/overview/', DashboardOverviewView.as_view(), name='dashboard-overview'),
    path('dashboard/search/', DashboardSearchView.as_view(), name='dashboard-search'),

    path('permisos-filtrados/', PermisosFiltradosView.as_view(), name='permisos-filtrados'),

    path('', include(router.urls)),
]
