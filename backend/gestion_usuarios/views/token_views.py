# gestion_usuarios/views/token_views.py
from rest_framework_simplejwt.views import TokenRefreshView
from gestion_usuarios.utils.throttles import RefreshTokenThrottle

class CustomTokenRefreshView(TokenRefreshView):
    throttle_classes = [RefreshTokenThrottle]
