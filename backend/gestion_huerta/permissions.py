from rest_framework.permissions import BasePermission, DjangoModelPermissions
from gestion_usuarios.permissions import IsAdmin, IsUser, RolePermissionMixin


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


class RolePermissionHuertaMixin(RolePermissionMixin):
    """
    Permiso por rol para huerta (admin y usuario por defecto).
    """
    allowed_roles = ['admin', 'usuario']

    def has_permission(self, request, view):
        return request.user and request.user.role in self.allowed_roles


class HasHuertaModulePermission(BasePermission):
    """
    Verifica si el usuario tiene permiso general para entrar al módulo de huerta.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        if request.user.role == 'admin':
            return True

        return request.user.has_perm('gestion_huerta.access_module')


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
