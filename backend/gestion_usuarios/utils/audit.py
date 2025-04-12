# gestion_usuarios/utils/audit.py

from gestion_usuarios.utils.activity import registrar_actividad

class AuditMixin:
    def audit(self, request, user, accion: str, detalles: str = ""):
        ip = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT')
        registrar_actividad(user, accion, detalles=detalles, ip=ip, user_agent=user_agent)

class AuditUpdateMixin:
    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        self.audit(request, request.user, "Actualización de perfil", "Modificó sus datos de usuario.")
        return response
