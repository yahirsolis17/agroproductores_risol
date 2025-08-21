from gestion_usuarios.models import RegistroActividad
import logging

logger = logging.getLogger(__name__)


def registrar_actividad(usuario, accion, detalles=None):
    try:
        RegistroActividad.objects.create(
            usuario=usuario,
            accion=accion,
            detalles=detalles,
        )
        logger.info("Actividad registrada: %s", accion)
    except Exception as e:
        logger.error("Error al registrar actividad: %s", e)
