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
    """Generic codename checker that honors group permissions."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Admin always passes
        if user.role == "admin":
            return True

        required = getattr(view, "required_permissions", [])
        if not required:
            return True

        app_label = getattr(view, "permission_app", "")
        for codename in required:
            full_code = codename if "." in codename else f"{app_label}.{codename}" if app_label else codename
            if user.has_perm(full_code):
                return True
        return False

