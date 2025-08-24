# -*- coding: utf-8 -*-
from __future__ import annotations
from typing import Dict, Any, Optional

from gestion_huerta.services.exportacion.pdf_exporter import PDFExporter
from gestion_huerta.services.exportacion.excel_exporter import ExcelExporter

class ExportacionService:
    """Fachada que conserva la interfaz original y delega en exportadores específicos."""

    # ---- COSECHA ----
    @staticmethod
    def generar_pdf_cosecha(reporte_data: Dict[str, Any]) -> bytes:
        return PDFExporter.generar_pdf_cosecha(reporte_data)

    @staticmethod
    def generar_excel_cosecha(reporte_data: Dict[str, Any]) -> bytes:
        return ExcelExporter.generar_excel_cosecha(reporte_data)

    # ---- TEMPORADA ----
    @staticmethod
    def generar_pdf_temporada(reporte_data: Dict[str, Any]) -> bytes:
        return PDFExporter.generar_pdf_temporada(reporte_data)

    @staticmethod
    def generar_excel_temporada(reporte_data: Dict[str, Any]) -> bytes:
        return ExcelExporter.generar_excel_temporada(reporte_data)

    # ---- PERFIL HUERTA ----
    @staticmethod
    def generar_pdf_perfil_huerta(reporte_data: Dict[str, Any]) -> bytes:
        return PDFExporter.generar_pdf_perfil_huerta(reporte_data)

    @staticmethod
    def generar_excel_perfil_huerta(reporte_data: Dict[str, Any]) -> bytes:
        return ExcelExporter.generar_excel_perfil_huerta(reporte_data)
