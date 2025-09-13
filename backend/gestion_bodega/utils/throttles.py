# Scopes de rate-limit alineados al proyecto.
from rest_framework.throttling import UserRateThrottle


class BaseUserThrottle(UserRateThrottle):
    scope = "default_user"


class BodegaWriteThrottle(UserRateThrottle):
    """Para recepciones/clasificaciones/pedidos frecuentes."""
    scope = "bodega_write"


class BodegaSensitiveThrottle(UserRateThrottle):
    """Para cierres, ajustes de inventario, cancelaciones."""
    scope = "bodega_sensitive"


class BodegaExportThrottle(UserRateThrottle):
    """Para descargas de reportes PDF/Excel."""
    scope = "bodega_export"
