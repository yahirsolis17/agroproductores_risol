# backend/gestion_bodega/utils/semana.py
from __future__ import annotations

from datetime import date, timedelta
from typing import Tuple, Optional

from django.utils import timezone

from gestion_bodega.models import CierreSemanal, TemporadaBodega


# ──────────────────────────────────────────────────────────────────────────────
# Helpers de semana ISO (lunes–domingo) con política: SIN semana 0 (1-based)
# ──────────────────────────────────────────────────────────────────────────────

def tz_today_mx() -> date:
    """
    'Hoy' según TIME_ZONE del proyecto (debería ser America/Mexico_City).
    """
    return timezone.localdate()


def iso_week_bounds(d: date) -> Tuple[date, date]:
    """
    Regresa (lunes, domingo) de la semana ISO que contiene 'd'.
    """
    monday = d - timedelta(days=d.weekday())          # weekday(): lunes=0 .. domingo=6
    sunday = monday + timedelta(days=6)
    return monday, sunday


def iso_week_code(d: date) -> str:
    """
    Código ISO tipo 'YYYY-Www' de la fecha 'd' (usa calendario ISO).
    """
    iso = d.isocalendar()  # (iso_year, iso_week, iso_weekday)
    return f"{iso.year}-W{iso.week:02d}"


def season_anchor_monday(fecha_inicio: date) -> date:
    """
    Lunes de la semana ISO que contiene 'fecha_inicio'. Esa semana es la #1,
    aunque recorte por inicio de temporada (NO existe semana 0).
    """
    monday, _ = iso_week_bounds(fecha_inicio)
    return monday


def season_week_index(d: date, fecha_inicio_temporada: date) -> int:
    """
    Índice de semana (1-based) para la fecha 'd' dentro de la temporada que
    inicia en 'fecha_inicio_temporada'. Se ancla al lunes ISO de la semana de
    inicio y NO existe semana 0.
    """
    anchor = season_anchor_monday(fecha_inicio_temporada)
    delta_days = (d - anchor).days
    idx = (delta_days // 7) + 1
    return max(1, idx)


def season_week_bounds(temporada: TemporadaBodega, semana_ix: int) -> Tuple[date, date, str]:
    """
    Límites (desde,hasta) de la semana_ix (1-based) para una temporada,
    recortados a los límites de la temporada. También regresa el iso_week_code
    del lunes ancla de esa semana (útil para CierreSemanal.iso_semana).
    """
    if semana_ix < 1:
        semana_ix = 1

    anchor = season_anchor_monday(temporada.fecha_inicio)
    week_monday = anchor + timedelta(weeks=semana_ix - 1)
    week_sunday = week_monday + timedelta(days=6)

    # recorte a temporada
    desde = max(week_monday, temporada.fecha_inicio)
    hasta = week_sunday
    if temporada.fecha_fin:
        hasta = min(hasta, temporada.fecha_fin)

    return desde, hasta, iso_week_code(week_monday)


# ──────────────────────────────────────────────────────────────────────────────
# Validaciones de cierre (manteniendo tus shortcuts originales)
# ──────────────────────────────────────────────────────────────────────────────

def semana_cerrada_ids(bodega_id: int, temporada_id: int, f: date) -> bool:
    """
    True si existe un CierreSemanal activo (bodega+temporada) que cubre la fecha f.
    """
    if not (bodega_id and temporada_id and f):
        return False
    return CierreSemanal.objects.filter(
        bodega_id=bodega_id,
        temporada_id=temporada_id,
        fecha_desde__lte=f,
        fecha_hasta__gte=f,
        is_active=True,
    ).exists()


def semana_cerrada(bodega, temporada, f: date) -> bool:
    """
    Variante que acepta instancias (o None). Hace el mismo check que semana_cerrada_ids.
    """
    if not (bodega and temporada and f):
        return False
    return semana_cerrada_ids(getattr(bodega, "id", None), getattr(temporada, "id", None), f)


# ──────────────────────────────────────────────────────────────────────────────
# NUEVOS HELPERS (mínimos) para Semanas Manuales (Tablero)
# ──────────────────────────────────────────────────────────────────────────────

def semana_abierta_actual(bodega_id: int, temporada_id: int) -> Optional[CierreSemanal]:
    """
    Devuelve la semana manual ABIERTA (si existe) para (bodega, temporada).
    Invariante del modelo: a lo sumo 1 abierta por contexto.
    """
    if not (bodega_id and temporada_id):
        return None
    return (
        CierreSemanal.objects.filter(
            bodega_id=bodega_id,
            temporada_id=temporada_id,
            is_active=True,
            fecha_hasta__isnull=True,
        )
        .order_by("-fecha_desde")
        .first()
    )


def rango_por_semana_id(semana_id: int) -> Tuple[date, date, Optional[str]]:
    """
    Resuelve el rango [desde, hasta] de un CierreSemanal por PK.
    Si la semana está abierta (fecha_hasta = NULL), usamos:
        hasta = min(fecha_desde + 6 días, hoy)
    Devuelve (desde, hasta, iso_semana_label).
    """
    cierre = CierreSemanal.objects.filter(pk=semana_id, is_active=True).first()
    if not cierre:
        raise ValueError("CierreSemanal no encontrado o inactivo.")

    desde: date = cierre.fecha_desde
    if cierre.fecha_hasta:
        hasta: date = cierre.fecha_hasta
    else:
        # Semana abierta: acotamos a desde+6 o hoy, lo que ocurra primero (máx. 7 días visibles).
        hoy = tz_today_mx()
        hasta = min(desde + timedelta(days=6), hoy)

    label = getattr(cierre, "iso_semana", None) or iso_week_code(desde)
    return desde, hasta, label
