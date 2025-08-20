from gestion_usuarios.permissions import IsAdmin, IsUser, HasModulePermission


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


# Compatibilidad hacia atrás: usar el permiso genérico del módulo de usuarios.
HasHuertaModulePermission = HasModulePermission

