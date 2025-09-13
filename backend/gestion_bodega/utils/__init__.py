from .activity import registrar_actividad, audit
from .notification_handler import NotificationHandler

try:
    from .cache_keys import generate_cache_key, REPORTES_CACHE_TIMEOUT, REPORTES_CACHE_VERSION
except Exception:  # pragma: no cover
    # Disponibles cuando el módulo se usa en contexto de reportes
    generate_cache_key = None  # type: ignore
    REPORTES_CACHE_TIMEOUT = None  # type: ignore
    REPORTES_CACHE_VERSION = None  # type: ignore

try:
    from .reporting import D, Flt, fmt_money, fmt_num
except Exception:  # pragma: no cover
    D = Flt = fmt_money = fmt_num = None  # type: ignore

__all__ = [
    "registrar_actividad",
    "audit",
    "NotificationHandler",
    "generate_cache_key",
    "REPORTES_CACHE_TIMEOUT",
    "REPORTES_CACHE_VERSION",
    "D",
    "Flt",
    "fmt_money",
    "fmt_num",
]
