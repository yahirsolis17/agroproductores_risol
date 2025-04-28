from rest_framework.permissions import BasePermission, DjangoModelPermissions
from gestion_usuarios.permissions import IsAdmin, IsUser


class IsAdminForHuerta(IsAdmin):
    """
    Permiso específico para el módulo de huerta (admin total).
    """
    pass


class IsUserForHuerta(IsUser):
    """
    Permiso específico para usuarios comunes.
    """
    pass


class RolePermissionHuertaMixin():
    """
    Permiso por rol para huerta (admin y usuario por defecto).
    """
    allowed_roles = ['admin', 'usuario']

    def has_permission(self, request, view):
        return request.user and request.user.role in self.allowed_roles


class HasHuertaModulePermission(BasePermission):
    """
    Admin siempre puede.
    Usuario normal puede si tiene permiso para ver huertas o propietarios.
    """

    def has_permission(self, request, view):
        user = request.user
        # no autenticado → bloqueado
        if not user or not user.is_authenticated:
            return False

        # admin → acceso total
        if user.role == 'admin':
            return True

        # usuarios comunes necesitan al menos uno de estos permisos
        return (
            user.has_perm('gestion_huerta.view_huerta') or
            user.has_perm('gestion_huerta.view_propietario')
        )

class HuertaGranularPermission(DjangoModelPermissions):
    """
    Permiso híbrido:
    - Admin tiene acceso total.
    - Usuarios normales deben tener permisos específicos (add, change, delete, view).
    """

    def has_permission(self, request, view):
        # Acceso total para admins
        if request.user.is_authenticated and request.user.role == 'admin':
            return True

        # Para los demás, usa el sistema estándar de DjangoModelPermissions
        return super().has_permission(request, view)

    def has_object_permission(self, request, view, obj):
        # Admin tiene acceso directo
        if request.user.is_authenticated and request.user.role == 'admin':
            return True

        return super().has_object_permission(request, view, obj)
