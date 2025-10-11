# gestion_usuarios/apps.py
from django.apps import AppConfig

class GestionUsuariosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'gestion_usuarios'

    def ready(self):
        # Registra señales para crear permisos personalizados tras migraciones
        try:
            from . import signals  # noqa: F401
        except Exception:
            # Evita romper inicialización si el entorno aún no está listo
            pass
