"""
Permisos para el módulo `gestion_bodega`.

Mantiene el mismo patrón que en el resto del proyecto:
- Permisos por rol (admin/usuario).
- Reutiliza el permiso granular de módulo `HasModulePermission`.
- Mezcla sencilla para declarar roles permitidos por vista.

Uso típico en un ViewSet:
    from rest_framework.permissions import IsAuthenticated
    from gestion_bodega.permissions import (
        RolePermissionBodegaMixin,
        HasBodegaModulePermission,
    )

    class RecepcionesViewSet(ModelViewSet):
        permission_classes = [IsAuthenticated, RolePermissionBodegaMixin, HasBodegaModulePermission]
        allowed_roles = ["admin", "usuario"]  # opcional; por defecto ya admite ambos
"""


from rest_framework.permissions import BasePermission

# Estos vienen del módulo central de usuarios (ya usados en el resto del repo).
# No reinventamos la rueda: conservamos el mismo contrato.
try:
    from gestion_usuarios.permissions import IsAdmin, IsUser, HasModulePermission
except Exception:  # pragma: no cover
    # Fallbacks ultra mínimos para entornos donde aún no esté disponible el módulo:
    from rest_framework.permissions import SAFE_METHODS

    class IsAdmin(BasePermission):
        def has_permission(self, request, view):
            return getattr(request.user, "is_authenticated", False) and getattr(request.user, "role", None) == "admin"

    class IsUser(BasePermission):
        def has_permission(self, request, view):
            return getattr(request.user, "is_authenticated", False) and getattr(request.user, "role", None) in {"admin", "usuario"}

    class HasModulePermission(BasePermission):
        """
        Fallback: permite lectura a cualquiera autenticado y escribe solo admin.
        El real en `gestion_usuarios.permissions` valida codenames por acción.
        """
        def has_permission(self, request, view):
            if request.method in SAFE_METHODS:
                return getattr(request.user, "is_authenticated", False)
            return getattr(request.user, "role", None) == "admin"


class IsAdminForBodega(IsAdmin):
    """
    Alias semántico para vistas de bodega (admin total).
    Hereda 100% del comportamiento probado en gestion_usuarios.permissions.IsAdmin.
    """
    pass


class IsUserForBodega(IsUser):
    """
    Alias semántico para vistas de bodega (usuario estándar).
    Hereda 100% del comportamiento probado en gestion_usuarios.permissions.IsUser.
    """
    pass


class RolePermissionBodegaMixin(BasePermission):
    """
    Gate de rol para `gestion_bodega`. Útil para declarar rápidamente qué roles
    pueden acceder a una vista, manteniendo simetría con otros módulos.

    Ejemplo:
        class PedidosViewSet(...):
            permission_classes = [IsAuthenticated, RolePermissionBodegaMixin, HasBodegaModulePermission]
            allowed_roles = ["admin"]  # solo admins

    Si no defines `allowed_roles`, por defecto permite ["admin", "usuario"].
    """
    allowed_roles = ["admin", "usuario"]

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return False

        # Permite que cada vista opcionalmente sobreescriba `allowed_roles`
        allowed = getattr(view, "allowed_roles", getattr(self, "allowed_roles", ["admin", "usuario"]))
        return getattr(user, "role", None) in set(allowed)


# Re-export del permiso granular para mantener el naming consistente en bodega.
# El real valida codenames/acciones por vista (add/change/delete/etc.).
HasBodegaModulePermission = HasModulePermission
