# gestion_usuarios/views/token_views.py
from rest_framework_simplejwt.views import TokenRefreshView

class CustomTokenRefreshView(TokenRefreshView):
    pass
