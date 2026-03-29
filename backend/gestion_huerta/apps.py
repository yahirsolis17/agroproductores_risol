from django.apps import AppConfig


class GestionHuertaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'gestion_huerta'

    def ready(self):
        try:
            from . import signals  # noqa: F401
        except Exception:
            pass
