from gestion_usuarios.models import RegistroActividad
import logging

logger = logging.getLogger(__name__)

def registrar_actividad(usuario, accion, detalles=None, ip=None):
    RegistroActividad.objects.create(
        usuario=usuario,
        accion=accion,
        detalles=detalles,
        ip=ip,
    )

def audit(self, mensaje: str, detalles: str = None):
    try:
        ip        = self.request.META.get('REMOTE_ADDR')
        registrar_actividad(
            usuario=self.request.user,
            accion=mensaje,
            detalles=detalles,
            ip=ip,
        )
        logger.info(f"Actividad registrada: {mensaje} - IP: {ip} ")
    except Exception as e:
        logger.error(f"Error al registrar actividad: {e}")
