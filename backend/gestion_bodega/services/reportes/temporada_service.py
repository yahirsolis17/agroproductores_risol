"""Funciones de dominio para el reporte de temporada de bodega."""
from __future__ import annotations

from typing import Any

from ...utils import reporting
from ..exportacion.excel_exporter import ExcelExporter


def _ensure_ids(bodega_id: Any, temporada_id: Any) -> tuple[int, int]:
    try:
        bodega = int(bodega_id)
        temporada = int(temporada_id)
    except (TypeError, ValueError) as exc:
        raise ValueError("Debes indicar IDs numericos de bodega y temporada.") from exc
    if bodega <= 0 or temporada <= 0:
        raise ValueError("Los IDs de bodega y temporada deben ser positivos.")
    return bodega, temporada


def build_reporte_temporada_json(bodega_id: Any, temporada_id: Any) -> dict[str, Any]:
    """Regresa la estructura JSON base utilizada en los reportes de temporada."""
    bodega, temporada = _ensure_ids(bodega_id, temporada_id)
    return reporting.aggregates_for_temporada(bodega, temporada)


def build_reporte_temporada_pdf(bodega_id: Any, temporada_id: Any) -> tuple[bytes, str]:
    """Genera el PDF del reporte de temporada y devuelve (bytes, filename)."""
    bodega, temporada = _ensure_ids(bodega_id, temporada_id)
    reporte_data = reporting.aggregates_for_temporada(bodega, temporada)
    pdf_bytes = reporting.render_temporada_pdf_from_data(reporte_data)
    filename = f"reporte_temporada_bodega_{bodega}_T{temporada}.pdf"
    return pdf_bytes, filename


def build_reporte_temporada_excel(bodega_id: Any, temporada_id: Any) -> tuple[bytes, str]:
    """Genera el Excel del reporte de temporada y devuelve (bytes, filename)."""
    bodega, temporada = _ensure_ids(bodega_id, temporada_id)
    reporte_data = reporting.aggregates_for_temporada(bodega, temporada)
    xlsx_bytes = ExcelExporter.generar_excel_temporada(reporte_data)
    filename = f"reporte_temporada_bodega_{bodega}_T{temporada}.xlsx"
    return xlsx_bytes, filename
