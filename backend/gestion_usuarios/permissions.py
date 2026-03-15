from typing import Iterable

from rest_framework.permissions import BasePermission


def _log_permission_denied(
    request,
    *,
    reason: str,
    required: Iterable[str] | None = None,
    extra: str | None = None,
):
    try:
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return

        from gestion_usuarios.utils.activity import registrar_actividad

        detail_parts = [
            f"motivo={reason}",
            f"ruta={getattr(request, 'path', '-')}",
            f"metodo={getattr(request, 'method', '-')}",
        ]

        required_list = [perm for perm in (required or []) if perm]
        if required_list:
            detail_parts.append(f"permisos_requeridos={', '.join(required_list)}")
        if extra:
            detail_parts.append(extra)

        registrar_actividad(
            usuario=user,
            accion="Intento de acceso denegado",
            detalles="; ".join(detail_parts),
            ip=getattr(request, "META", {}).get("REMOTE_ADDR"),
            user_agent=getattr(request, "META", {}).get("HTTP_USER_AGENT"),
        )
    except Exception:
        pass


class IsAdmin(BasePermission):
    """
    Bypass por rol solo para panel de gestion de usuarios y auditoria.
    """

    def has_permission(self, request, view):
        allowed = bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "admin"
        )
        if request.user and request.user.is_authenticated and not allowed:
            _log_permission_denied(
                request,
                reason="admin_only_view",
                extra=f"vista={view.__class__.__name__}",
            )
        return allowed


class IsUser(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "usuario"
        )


class IsSelfOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        allowed = bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role == "admin" or obj == request.user)
        )
        if request.user and request.user.is_authenticated and not allowed:
            _log_permission_denied(
                request,
                reason="self_or_admin_only",
                extra=f"vista={view.__class__.__name__}; objetivo_usuario_id={getattr(obj, 'id', '-')}",
            )
        return allowed


class HasModulePermission(BasePermission):
    """
    Admin siempre pasa; usuarios deben tener al menos un codename requerido.
    Si la vista no define `required_permissions`, para usuarios comunes se niega.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if getattr(user, "role", None) == "admin":
            return True

        required = getattr(view, "required_permissions", [])
        if not required:
            _log_permission_denied(
                request,
                reason="required_permissions_missing",
                extra=f"vista={view.__class__.__name__}",
            )
            return False

        dotted = user.get_all_permissions()
        plains = {p.split(".", 1)[1] if "." in p else p for p in dotted}
        allowed = any(perm in plains for perm in required)

        if not allowed:
            _log_permission_denied(
                request,
                reason="missing_any_required_permission",
                required=required,
                extra=f"vista={view.__class__.__name__}",
            )
        return allowed


class HasModulePermissionAnd(BasePermission):
    """
    Variante que exige TODOS los codenames en `required_permissions`.
    Si la vista no define `required_permissions`, para usuarios comunes se niega.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if getattr(user, "role", None) == "admin":
            return True

        required = getattr(view, "required_permissions", [])
        if not required:
            _log_permission_denied(
                request,
                reason="required_permissions_missing",
                extra=f"vista={view.__class__.__name__}",
            )
            return False

        dotted = user.get_all_permissions()
        plains = {p.split(".", 1)[1] if "." in p else p for p in dotted}
        allowed = all(perm in plains for perm in required)

        if not allowed:
            _log_permission_denied(
                request,
                reason="missing_all_required_permissions",
                required=required,
                extra=f"vista={view.__class__.__name__}",
            )
        return allowed
