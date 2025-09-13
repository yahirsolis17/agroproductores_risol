"""
Azúcar sintáctica para registrar eventos de actividad/auditoría
desde vistas o servicios del módulo bodega.
"""
from .audit import write_activity, audit_event


def log_ok(request, accion: str, detalle: str = "", meta: dict | None = None):
    write_activity(request.user, accion=accion, detalle=detalle, meta=meta or {})


def build_event(request, accion: str, modelo: str, objeto_id, detalle: str = "", meta: dict | None = None):
    return audit_event(
        user=request.user,
        accion=accion,
        modelo=modelo,
        objeto_id=objeto_id,
        detalle=detalle,
        meta=meta or {},
    )
