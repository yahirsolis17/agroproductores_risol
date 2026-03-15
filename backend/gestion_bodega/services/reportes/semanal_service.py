"""Funciones de dominio para el reporte semanal de bodega."""
from __future__ import annotations

from typing import Any, Tuple

from ...utils import reporting
from ..exportacion.excel_exporter import ExcelExporter


def _ensure_ids(bodega_id: Any, temporada_id: Any) -> Tuple[int, int]:
    try:
        bodega = int(bodega_id)
        temporada = int(temporada_id)
    except (TypeError, ValueError) as exc:
        raise ValueError("Debes indicar IDs numericos de bodega y temporada.") from exc
    if bodega <= 0 or temporada <= 0:
        raise ValueError("Los IDs de bodega y temporada deben ser positivos.")
    return bodega, temporada


def build_reporte_semanal_json(bodega_id: Any, temporada_id: Any, iso_semana: str) -> dict[str, Any]:
    """Regresa la estructura JSON completa del reporte semanal."""
    if not iso_semana:
        raise ValueError("Debes indicar la semana en formato ISO (YYYY-Www).")
    bodega, temporada = _ensure_ids(bodega_id, temporada_id)
    return reporting.aggregates_for_semana(bodega, temporada, iso_semana)


def build_reporte_semanal_pdf(bodega_id: Any, temporada_id: Any, iso_semana: str) -> tuple[bytes, str]:
    """Genera el PDF del reporte semanal y devuelve (bytes, filename)."""
    if not iso_semana:
        raise ValueError("Debes indicar la semana en formato ISO (YYYY-Www).")
    bodega, temporada = _ensure_ids(bodega_id, temporada_id)
    reporte_data = reporting.aggregates_for_semana(bodega, temporada, iso_semana)
    pdf_bytes = reporting.render_semana_pdf_from_data(reporte_data)
    filename = f"reporte_semanal_bodega_{bodega}_{iso_semana}.pdf"
    return pdf_bytes, filename


def build_reporte_semanal_excel(bodega_id: Any, temporada_id: Any, iso_semana: str) -> tuple[bytes, str]:
    """Genera el Excel del reporte semanal y devuelve (bytes, filename)."""
    if not iso_semana:
        raise ValueError("Debes indicar la semana en formato ISO (YYYY-Www).")
    bodega, temporada = _ensure_ids(bodega_id, temporada_id)
    reporte_data = reporting.aggregates_for_semana(bodega, temporada, iso_semana)
    xlsx_bytes = ExcelExporter.generar_excel_semanal(reporte_data)
    filename = f"reporte_semanal_bodega_{bodega}_{iso_semana}.xlsx"
    return xlsx_bytes, filename
