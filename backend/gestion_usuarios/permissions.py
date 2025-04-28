# src/gestion_usuarios/permissions.py
from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
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
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Admin → acceso total
        if request.user.role == 'admin':
            return True

        required = getattr(view, 'required_permissions', [])
        if not required:
            # Si la vista no define permisos, la dejamos pública para usuarios autenticados
            return True

        # Usa el manager real de Django
        return request.user.user_permissions.filter(
            codename__in=required
        ).exists()
