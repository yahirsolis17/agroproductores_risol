import logging

from django.apps import AppConfig


logger = logging.getLogger(__name__)


class GestionUsuariosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'gestion_usuarios'

    def ready(self):
        # Registra señales para crear permisos personalizados tras migraciones
        try:
            from . import signals  # noqa: F401
        except Exception:
            logger.exception("No se pudieron registrar las señales de gestion_usuarios.")
            raise
