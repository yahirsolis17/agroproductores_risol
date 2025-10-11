from rest_framework.permissions import BasePermission
from gestion_usuarios.permissions import (
    IsAdmin,
    IsUser,
    HasModulePermission,
    HasModulePermissionAnd,
)


class IsAdminForHuerta(IsAdmin):
    """
    Permiso específico para el módulo de huerta (admin total).
    Hereda la lógica comprobada de IsAdmin.
    """
    pass


class IsUserForHuerta(IsUser):
    """
    Permiso específico para usuarios comunes en el módulo de huerta.
    Hereda la lógica comprobada de IsUser.
    """
    pass


class RolePermissionHuertaMixin(BasePermission):
    """
    Permiso por rol para el módulo de huerta.
    Útil para vistas donde ambos (admin/usuario) pueden entrar,
    pero quieres un gate explícito de autenticación + rol permitido.

    Uso típico:
      permission_classes = [IsAuthenticated, RolePermissionHuertaMixin]
    """
    allowed_roles = ['admin', 'usuario']

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        role = getattr(user, 'role', None)
        return role in getattr(self, 'allowed_roles', self.allowed_roles)


# Compatibilidad hacia atrás: usar el permiso genérico del módulo de usuarios.
HasHuertaModulePermission = HasModulePermission
HasHuertaModulePermissionAnd = HasModulePermissionAnd
