
"""Funciones de dominio para el reporte semanal de bodega."""
from __future__ import annotations

from typing import Any, Tuple

from ...utils import reporting

_FORMATO_NO_DISPONIBLE = "El formato '{formato}' todavía no está disponible."


def _ensure_ids(bodega_id: Any, temporada_id: Any) -> Tuple[int, int]:
    try:
        bodega = int(bodega_id)
        temporada = int(temporada_id)
    except (TypeError, ValueError) as exc:  # pragma: no cover - validaciones simples
        raise ValueError("Debes indicar IDs numéricos de bodega y temporada.") from exc
    if bodega <= 0 or temporada <= 0:
        raise ValueError("Los IDs de bodega y temporada deben ser positivos.")
    return bodega, temporada


def build_reporte_semanal_json(bodega_id: Any, temporada_id: Any, iso_semana: str) -> dict[str, Any]:
    """Regresa la estructura JSON que consumen los reportes semanales."""
    if not iso_semana:
        raise ValueError("Debes indicar la semana en formato ISO (YYYY-Www).")
    bodega, temporada = _ensure_ids(bodega_id, temporada_id)
    return reporting.aggregates_for_semana(bodega, temporada, iso_semana)


def build_reporte_semanal_pdf(bodega_id: Any, temporada_id: Any, iso_semana: str) -> tuple[bytes, str]:
    """Placeholder: en esta etapa sólo informamos que el formato no está listo."""
    raise NotImplementedError(_FORMATO_NO_DISPONIBLE.format(formato="pdf"))


def build_reporte_semanal_excel(bodega_id: Any, temporada_id: Any, iso_semana: str) -> tuple[bytes, str]:
    """Placeholder: en esta etapa sólo informamos que el formato no está listo."""
    raise NotImplementedError(_FORMATO_NO_DISPONIBLE.format(formato="excel"))
