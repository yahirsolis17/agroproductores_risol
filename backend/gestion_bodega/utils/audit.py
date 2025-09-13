from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Optional

from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model

try:
    # Si existe el modelo de actividad global del proyecto:
    from gestion_usuarios.models import RegistroActividad
except Exception:  # pragma: no cover
    RegistroActividad = None  # Fallback si no está disponible


@dataclass
class AuditEvent:
    """
    Representa un evento auditable del módulo de bodega.
    """
    modulo: str               # "bodega"
    accion: str               # "create", "update", "delete", "close_week", etc.
    modelo: str               # "Recepcion", "ClasificacionEmpaque", ...
    objeto_id: Any            # pk del objeto afectado
    usuario_id: Optional[int] # user.id si disponible
    detalle: str = ""         # texto libre
    meta: dict | None = None  # extra (antes/después, filtros, etc.)
    creado_en: Any = None     # set automático

    def as_dict(self):
        data = asdict(self)
        data["creado_en"] = data["creado_en"] or timezone.now().isoformat()
        return data


def write_activity(user, accion: str, detalle: str = "", meta: dict | None = None):
    """
    Registra en RegistroActividad (si existe) para trazabilidad humana.
    """
    if RegistroActividad is None:
        return

    try:
        RegistroActividad.objects.create(
            usuario=user,
            accion=f"[bodega] {accion}",
            detalles=detalle or "",
            ip=meta.get("ip") if isinstance(meta, dict) else None,
        )
    except Exception:
        # Nunca romper flujo de negocio por auditoría
        pass


def audit_event(user, accion: str, modelo: str, objeto_id: Any, detalle: str = "", meta: dict | None = None) -> AuditEvent:
    """
    Construye un evento auditable (en memoria). Útil para adjuntar a logs/notifications.
    """
    ev = AuditEvent(
        modulo="bodega",
        accion=accion,
        modelo=modelo,
        objeto_id=objeto_id,
        usuario_id=getattr(user, "id", None),
        detalle=detalle or "",
        meta=meta or {},
        creado_en=timezone.now(),
    )
    # Hook: aquí podrías enviar a un bus/cola si más adelante necesitas SIEM.
    return ev


def audited_action(func):
    """
    Decorador para vistas: asegura atomicidad y captura de auditoría/actividad.
    - Entra en transacción.
    - Si la acción falla, no escribe actividad.
    """
    def wrapper(view, request, *args, **kwargs):
        with transaction.atomic():
            result = func(view, request, *args, **kwargs)
            try:
                # Log suave post-acción (no romper flujo)
                write_activity(
                    request.user,
                    accion=f"{view.__class__.__name__}.{func.__name__}",
                    detalle=f"HTTP {request.method} {request.path}",
                    meta={"ip": request.META.get("REMOTE_ADDR")},
                )
            except Exception:
                pass
            return result
    return wrapper
