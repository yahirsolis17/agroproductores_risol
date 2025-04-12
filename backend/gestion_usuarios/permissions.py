from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.role == 'admin'

class IsUser(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.role == 'usuario'

class IsSelfOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.role == 'admin' or obj == request.user

class RolePermissionMixin(BasePermission):
    allowed_roles = []

    def has_permission(self, request, view):
        return request.user.role in self.allowed_roles
