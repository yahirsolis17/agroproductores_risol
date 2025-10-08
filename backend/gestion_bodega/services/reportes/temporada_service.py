
"""Funciones de dominio para el reporte de temporada de bodega."""
from __future__ import annotations

from typing import Any

from ...utils import reporting

_FORMATO_NO_DISPONIBLE = "El formato '{formato}' todavía no está disponible."


def _ensure_ids(bodega_id: Any, temporada_id: Any) -> tuple[int, int]:
    try:
        bodega = int(bodega_id)
        temporada = int(temporada_id)
    except (TypeError, ValueError) as exc:  # pragma: no cover
        raise ValueError("Debes indicar IDs numéricos de bodega y temporada.") from exc
    if bodega <= 0 or temporada <= 0:
        raise ValueError("Los IDs de bodega y temporada deben ser positivos.")
    return bodega, temporada


def build_reporte_temporada_json(bodega_id: Any, temporada_id: Any) -> dict[str, Any]:
    """Regresa la estructura JSON base utilizada en los reportes de temporada."""
    bodega, temporada = _ensure_ids(bodega_id, temporada_id)
    return reporting.aggregates_for_temporada(bodega, temporada)


def build_reporte_temporada_pdf(bodega_id: Any, temporada_id: Any) -> tuple[bytes, str]:
    raise NotImplementedError(_FORMATO_NO_DISPONIBLE.format(formato="pdf"))


def build_reporte_temporada_excel(bodega_id: Any, temporada_id: Any) -> tuple[bytes, str]:
    raise NotImplementedError(_FORMATO_NO_DISPONIBLE.format(formato="excel"))
