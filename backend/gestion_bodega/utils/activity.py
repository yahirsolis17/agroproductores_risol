from gestion_usuarios.models import RegistroActividad
import logging

logger = logging.getLogger(__name__)


def registrar_actividad(usuario, accion, detalles=None, ip=None, user_agent=None):
    """
    Crea un registro de actividad de manera resiliente.
    """
    try:
        RegistroActividad.objects.create(
            usuario=usuario,
            accion=accion,
            detalles=detalles,
            ip=ip,
        )
        # Log informativo (no falla si user_agent es None)
        logger.info(
            "Actividad registrada: %s | IP: %s | UA: %s",
            accion,
            ip or "-",
            (user_agent or "")[:256],  # acotamos tamaño en logs
        )
    except Exception as e:
        logger.error("Error al registrar actividad: %s", e)


def audit(self_or_request, mensaje: str, detalles: str = None):
    """
    Mantiene compatibilidad con llamadas existentes que usan `audit(self, ...)`
    (asumiendo un View/ViewSet con `self.request`) **y** permite pasar
    directamente un `request`.

    Ejemplos válidos:
      audit(self, "Creó huerta", "ID=5")
      audit(request, "Actualizó huerta", "nombre: X → Y")

    No lanza excepción si algo falta; simplemente loguea el error.
    """
    try:
        # Resolver el request desde self o directamente
        if hasattr(self_or_request, "META"):               # es un request
            request = self_or_request
        elif hasattr(self_or_request, "request"):          # es self (view/viewset)
            request = self_or_request.request
        else:
            request = None

        user = getattr(request, "user", None) if request else None
        ip = request.META.get("REMOTE_ADDR") if request else None
        ua = request.META.get("HTTP_USER_AGENT") if request else None

        if not user:
            logger.warning("audit(): no hay usuario autenticado asociado a la petición.")
            return

        registrar_actividad(
            usuario=user,
            accion=mensaje,
            detalles=detalles,
            ip=ip,
            user_agent=ua,
        )
    except Exception as e:
        logger.error("Error en audit(): %s", e)
