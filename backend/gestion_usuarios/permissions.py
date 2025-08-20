# src/gestion_usuarios/permissions.py
from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    """
    Bypass por ROL solo para panel de gestión de usuarios / auditoría.
    """
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'admin'
        )

class IsUser(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == 'usuario'
        )

class IsSelfOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role == 'admin' or obj == request.user)
        )

class HasModulePermission(BasePermission):
    """
    Admin siempre pasa; usuarios deben tener algún codename en required_permissions.
    Respeta permisos por grupo usando get_all_permissions().
    """
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Admin → acceso total (solo debería usarse en vistas de gestión de usuarios)
        if getattr(user, 'role', None) == 'admin':
            return True

        required = getattr(view, 'required_permissions', [])
        if not required:
            # Si la vista no define permisos, la dejamos pública para usuarios autenticados
            return True

        # Recolecta todos los permisos (incluye grupos) y pásalos a planos
        dotted = user.get_all_permissions()
        plains = {p.split('.', 1)[1] if '.' in p else p for p in dotted}

        return any(perm in plains for perm in required)
