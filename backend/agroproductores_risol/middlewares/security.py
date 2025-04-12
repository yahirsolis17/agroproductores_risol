# agroproductores_risol/backend/agroproductores_risol/middlewares/security.py

from django.shortcuts import redirect
from django.contrib.auth import logout
from django.urls import reverse
class RoleBasedRedirectMiddleware:
 
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            if request.user.is_superuser and request.path.startswith('/usuario/'):
                return redirect('admin_dashboard')
            elif not request.user.is_superuser and request.path.startswith('/gestion/'):
                return redirect('user_dashboard')
        response = self.get_response(request)
        return response

class PreventBackAfterLogoutMiddleware:
    """
    Middleware para prevenir que se pueda navegar hacia atrás después del logout.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if not request.user.is_authenticated:
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
        return response

class BlockInactiveUserMiddleware:
    """
    Middleware para bloquear a usuarios inactivos.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated and not request.user.is_active:
            print(f"Usuario bloqueado: {request.user.username}")
            logout(request)
            return redirect(reverse('gestion:login'))
        return self.get_response(request)
