from gestion_usuarios.models import RegistroActividad
import logging

logger = logging.getLogger(__name__)

def registrar_actividad(usuario, accion, detalles=None, ip=None, user_agent=None):
    try:
        RegistroActividad.objects.create(
            usuario=usuario,
            accion=accion,
            detalles=detalles,
            ip=ip,
            user_agent=user_agent
        )
        logger.info(f"Actividad registrada: {accion} - IP: {ip} - UA: {user_agent}")
    except Exception as e:
        logger.error(f"Error al registrar actividad: {e}")
