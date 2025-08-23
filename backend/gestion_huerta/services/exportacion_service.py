# backend/gestion_huerta/services/exportacion_service.py
# -*- coding: utf-8 -*-
"""
Servicio para exportar reportes de producción a PDF y Excel con enfoque en:
- Robustez frente a datos faltantes o tipos inesperados
- Soporte de miles de filas (tablas paginadas en PDF y write_only en Excel)
- Estilos consistentes y legibles
- Sin dependencias de campos no garantizados por el contrato
"""

from __future__ import annotations

from io import BytesIO
from typing import Dict, Any, Iterable, List, Tuple, Optional

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
    Spacer,
    PageBreak,
)

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
from openpyxl.worksheet.worksheet import Worksheet


# =========================
# Utilidades generales
# =========================

def _money(x: Any) -> float:
    try:
        return float(x or 0)
    except Exception:
        return 0.0


def _pct(x: Any) -> float:
    try:
        return float(x or 0)
    except Exception:
        return 0.0


def _safe_str(x: Any) -> str:
    return "" if x is None else str(x)


def _first(s: str, n: int = 10) -> str:
    return _safe_str(s)[:n] if s else ""


def _chunk_rows(rows: List[List[Any]], size: int) -> Iterable[List[List[Any]]]:
    """Parte filas en bloques para evitar tablas gigantes en PDF."""
    for i in range(0, len(rows), size):
        yield rows[i : i + size]


def _table_style_header(bg: colors.Color) -> TableStyle:
    return TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), bg),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (0, 0), (-1, 0), "CENTER"),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ]
    )


def _table_style_body(zebra: Tuple[colors.Color, colors.Color] = (colors.white, colors.lightgrey)) -> TableStyle:
    return TableStyle(
        [
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("ALIGN", (0, 1), (-1, -1), "CENTER"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), zebra),
            ("GRID", (0, 0), (-1, -1), 1, colors.black),
        ]
    )


def _pdf_doc(buffer: BytesIO) -> SimpleDocTemplate:
    return SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=0.5 * inch,
        leftMargin=0.5 * inch,
        rightMargin=0.5 * inch,
        bottomMargin=0.5 * inch,
    )


def _pdf_styles():
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Heading1"],
        fontSize=16,
        spaceAfter=20,
        alignment=1,
        textColor=colors.darkblue,
    )
    heading_style = ParagraphStyle(
        "CustomHeading",
        parent=styles["Heading2"],
        fontSize=12,
        spaceAfter=10,
        textColor=colors.darkgreen,
    )
    note_style = ParagraphStyle(
        "Note",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.grey,
        spaceBefore=4,
        spaceAfter=4,
    )
    return title_style, heading_style, note_style


def _ws_header(ws: Worksheet, title: str, merge_to_col: int = 6):
    ws["A1"] = title
    ws["A1"].font = Font(bold=True, size=16)
    end_col_letter = chr(ord("A") + merge_to_col - 1)
    ws.merge_cells(f"A1:{end_col_letter}1")


def _ws_section_title(ws: Worksheet, row: int, text: str):
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
    ws[f"A{row}"] = text
    ws[f"A{row}"].font = header_font
    ws[f"A{row}"].fill = header_fill


def _auto_width(ws: Worksheet, max_width: int = 50):
    # Heurística: calcula ancho basado en longitud de string; ignora celdas muy largas
    dims = {}
    for row in ws.iter_rows():
        for cell in row:
            v = "" if cell.value is None else str(cell.value)
            dims[cell.column_letter] = min(max(dims.get(cell.column_letter, 0), len(v) + 2), max_width)
    for col, width in dims.items():
        ws.column_dimensions[col].width = width


def _apply_border(ws: Worksheet, cell_range: str):
    thin = Side(style="thin", color="000000")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    for row in ws[cell_range]:
        for cell in row:
            cell.border = border


# ===================================================
# Servicio principal de exportación (PDF / Excel)
# ===================================================

class ExportacionService:
    """Servicio para exportar reportes a PDF y Excel (cosecha, temporada, perfil huerta)."""

    # =========================
    # COSECHA
    # =========================

    @staticmethod
    def generar_pdf_cosecha(reporte_data: Dict[str, Any]) -> bytes:
        """
        Genera PDF del reporte de cosecha.
        Seguro frente a claves faltantes y gran volumen de filas (tablas paginadas).
        """
        buffer = BytesIO()
        doc = _pdf_doc(buffer)
        title_style, heading_style, note_style = _pdf_styles()

        story: List[Any] = []

        story.append(Paragraph("REPORTE DE PRODUCCIÓN - COSECHA INDIVIDUAL", title_style))
        story.append(Spacer(1, 10))

        info = reporte_data.get("informacion_general", {}) or {}
        resumen = reporte_data.get("resumen_financiero", {}) or {}

        # Información General
        story.append(Paragraph("INFORMACIÓN GENERAL", heading_style))
        info_data = [
            ["Huerta:", f"{_safe_str(info.get('huerta_nombre'))} ({_safe_str(info.get('huerta_tipo'))})"],
            ["Propietario:", _safe_str(info.get("propietario"))],
            ["Temporada:", _safe_str(info.get("temporada_año"))],
            ["Cosecha:", _safe_str(info.get("cosecha_nombre"))],
            ["Estado:", _safe_str(info.get("estado"))],
            ["Hectáreas:", f"{_money(info.get('hectareas')):.2f} ha"],
        ]
        info_table = Table(info_data, colWidths=[2 * inch, 4 * inch], repeatRows=0, hAlign="LEFT")
        info_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        story.append(info_table)
        story.append(Spacer(1, 10))

        # Resumen financiero
        story.append(Paragraph("RESUMEN FINANCIERO", heading_style))
        resumen_data = [
            ["Concepto", "Monto"],
            ["Total Inversiones", f"${_money(resumen.get('total_inversiones')):,.2f}"],
            ["Total Ventas", f"${_money(resumen.get('total_ventas')):,.2f}"],
            ["Gastos de Venta", f"${_money(resumen.get('total_gastos_venta')):,.2f}"],
            ["Ganancia Bruta", f"${_money(resumen.get('ganancia_bruta')):,.2f}"],
            ["Ganancia Neta", f"${_money(resumen.get('ganancia_neta')):,.2f}"],
            ["ROI", f"{_pct(resumen.get('roi_porcentaje')):.1f}%"],
            ["Ganancia por Hectárea", f"${_money(resumen.get('ganancia_por_hectarea')):,.2f}"],
        ]
        res_table = Table(resumen_data, colWidths=[3 * inch, 2.2 * inch], repeatRows=1, hAlign="LEFT")
        res_table.setStyle(_table_style_header(colors.darkblue))
        res_table.setStyle(_table_style_body())
        story.append(res_table)
        story.append(Spacer(1, 10))

        # Detalle de Inversiones (paginado)
        inv_headers = ["Fecha", "Categoría", "Insumos", "Mano Obra", "Total", "Descripción"]
        inv_rows: List[List[Any]] = [inv_headers]
        for inv in reporte_data.get("detalle_inversiones", []) or []:
            inv_rows.append(
                [
                    _first(inv.get("fecha")),
                    _safe_str(inv.get("categoria") or "Sin categoría"),
                    f"${_money(inv.get('gastos_insumos')):,.2f}",
                    f"${_money(inv.get('gastos_mano_obra')):,.2f}",
                    f"${_money(inv.get('total')):,.2f}",
                    _safe_str(inv.get("descripcion")),
                ]
            )

        story.append(Paragraph("DETALLE DE INVERSIONES", heading_style))
        if len(inv_rows) == 1:
            story.append(Paragraph("Sin inversiones registradas.", note_style))
        else:
            # Partimos en bloques para no inflar demasiado un único Table
            header = inv_rows[0]
            body = inv_rows[1:]
            for i, chunk in enumerate(_chunk_rows(body, 800)):  # 800 filas por tabla ≈ seguro en A4
                data = [header] + chunk
                t = Table(
                    data,
                    colWidths=[1.0 * inch, 1.5 * inch, 1.1 * inch, 1.1 * inch, 1.1 * inch, 1.4 * inch],
                    repeatRows=1,
                    splitByRow=True,
                )
                t.setStyle(_table_style_header(colors.darkgreen))
                t.setStyle(_table_style_body())
                story.append(t)
                if i < (len(body) - 1) // 800:
                    story.append(PageBreak())

        story.append(Spacer(1, 10))

        # Detalle de Ventas (paginado)
        ven_headers = ["Fecha", "Variedad", "Cajas", "Precio/Caja", "Total", "Gasto", "Utilidad Neta"]
        ven_rows: List[List[Any]] = [ven_headers]
        for v in reporte_data.get("detalle_ventas", []) or []:
            ingreso = _money(v.get("total_venta"))
            gasto = _money(v.get("gasto"))
            util = _money(v.get("ganancia_neta")) if "ganancia_neta" in v else (ingreso - gasto)
            ven_rows.append(
                [
                    _first(v.get("fecha")),
                    _safe_str(v.get("tipo_mango")),
                    str(int(v.get("num_cajas") or 0)),
                    f"${_money(v.get('precio_por_caja')):,.2f}",
                    f"${ingreso:,.2f}",
                    f"${gasto:,.2f}",
                    f"${util:,.2f}",
                ]
            )

        story.append(Paragraph("DETALLE DE VENTAS", heading_style))
        if len(ven_rows) == 1:
            story.append(Paragraph("Sin ventas registradas.", note_style))
        else:
            header = ven_rows[0]
            body = ven_rows[1:]
            for i, chunk in enumerate(_chunk_rows(body, 800)):
                data = [header] + chunk
                t = Table(
                    data,
                    colWidths=[1.0 * inch, 1.5 * inch, 0.8 * inch, 1.1 * inch, 1.2 * inch, 1.0 * inch, 1.2 * inch],
                    repeatRows=1,
                    splitByRow=True,
                )
                t.setStyle(_table_style_header(HexColor("#FF8C00")))
                t.setStyle(_table_style_body())
                story.append(t)
                if i < (len(body) - 1) // 800:
                    story.append(PageBreak())

        # (Opcional) Análisis: categorías y variedades si llegan en el payload
        cats = reporte_data.get("analisis_categorias") or []
        if cats:
            story.append(Spacer(1, 10))
            story.append(Paragraph("ANÁLISIS DE CATEGORÍAS (Inversiones)", heading_style))
            data = [["Categoría", "Total", "%"]]
            for c in cats:
                data.append(
                    [
                        _safe_str(c.get("categoria")),
                        f"${_money(c.get('total')):,.2f}",
                        f"{_pct(c.get('porcentaje')):.1f}%",
                    ]
                )
            t = Table(data, colWidths=[2.5 * inch, 1.6 * inch, 0.8 * inch], repeatRows=1)
            t.setStyle(_table_style_header(HexColor("#2F5597")))
            t.setStyle(_table_style_body())
            story.append(t)

        vars_ = reporte_data.get("analisis_variedades") or []
        if vars_:
            story.append(Spacer(1, 10))
            story.append(Paragraph("ANÁLISIS DE VARIEDADES (Ventas)", heading_style))
            data = [["Variedad", "Cajas", "Precio Prom.", "Total", "%"]]
            for r in vars_:
                data.append(
                    [
                        _safe_str(r.get("variedad")),
                        str(int(r.get("total_cajas") or 0)),
                        f"${_money(r.get('precio_promedio')):,.2f}",
                        f"${_money(r.get('total_venta')):,.2f}",
                        f"{_pct(r.get('porcentaje')):.1f}%",
                    ]
                )
            t = Table(data, colWidths=[2.0 * inch, 0.9 * inch, 1.2 * inch, 1.6 * inch, 0.8 * inch], repeatRows=1)
            t.setStyle(_table_style_header(HexColor("#7030A0")))
            t.setStyle(_table_style_body())
            story.append(t)

        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def generar_excel_cosecha(reporte_data: Dict[str, Any]) -> bytes:
        """
        Genera Excel del reporte de cosecha.
        Usa `Workbook(write_only=True)` para escalar a miles de filas sin agotar memoria.
        """
        wb = Workbook(write_only=True)

        # Hoja Resumen
        ws_resumen = wb.create_sheet("Resumen")
        _ws_header(ws_resumen, "REPORTE DE PRODUCCIÓN - COSECHA INDIVIDUAL", merge_to_col=6)

        info = reporte_data.get("informacion_general", {}) or {}
        resumen = reporte_data.get("resumen_financiero", {}) or {}

        row = 3
        _ws_section_title(ws_resumen, row, "INFORMACIÓN GENERAL")
        info_data = [
            ("Huerta", f"{_safe_str(info.get('huerta_nombre'))} ({_safe_str(info.get('huerta_tipo'))})"),
            ("Propietario", _safe_str(info.get("propietario"))),
            ("Temporada", _safe_str(info.get("temporada_año"))),
            ("Cosecha", _safe_str(info.get("cosecha_nombre"))),
            ("Estado", _safe_str(info.get("estado"))),
            ("Hectáreas", f"{_money(info.get('hectareas')):.2f} ha"),
        ]
        for label, value in info_data:
            row += 1
            ws_resumen.append([label, value])
            ws_resumen.cell(row=row, column=1).font = Font(bold=True)

        row += 2
        _ws_section_title(ws_resumen, row, "RESUMEN FINANCIERO")
        resumen_rows = [
            ("Total Inversiones", _money(resumen.get("total_inversiones"))),
            ("Total Ventas", _money(resumen.get("total_ventas"))),
            ("Gastos de Venta", _money(resumen.get("total_gastos_venta"))),
            ("Ganancia Bruta", _money(resumen.get("ganancia_bruta"))),
            ("Ganancia Neta", _money(resumen.get("ganancia_neta"))),
            ("ROI (%)", _pct(resumen.get("roi_porcentaje"))),
            ("Ganancia por Hectárea", _money(resumen.get("ganancia_por_hectarea"))),
        ]
        for label, value in resumen_rows:
            row += 1
            ws_resumen.append([label, value])
            ws_resumen.cell(row=row, column=1).font = Font(bold=True)
            if isinstance(value, (int, float)) and "ROI" not in label:
                ws_resumen.cell(row=row, column=2).number_format = "#,##0.00"

        # Hoja Inversiones
        ws_inv = wb.create_sheet("Inversiones")
        ws_inv.append(["Fecha", "Categoría", "Insumos", "Mano Obra", "Total", "Descripción"])
        for cell in ws_inv[1]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")

        for inv in reporte_data.get("detalle_inversiones", []) or []:
            ws_inv.append(
                [
                    _first(inv.get("fecha")),
                    _safe_str(inv.get("categoria") or "Sin categoría"),
                    _money(inv.get("gastos_insumos")),
                    _money(inv.get("gastos_mano_obra")),
                    _money(inv.get("total")),
                    _safe_str(inv.get("descripcion")),
                ]
            )
        # formatos numéricos
        for row_cells in ws_inv.iter_rows(min_row=2):
            if len(row_cells) >= 5:
                for col in (3, 4, 5):
                    row_cells[col - 1].number_format = "#,##0.00"

        # Hoja Ventas
        ws_ven = wb.create_sheet("Ventas")
        ws_ven.append(["Fecha", "Variedad", "Cajas", "Precio/Caja", "Total", "Gasto", "Utilidad Neta"])
        for cell in ws_ven[1]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="7030A0", end_color="7030A0", fill_type="solid")

        for v in reporte_data.get("detalle_ventas", []) or []:
            ingreso = _money(v.get("total_venta"))
            gasto = _money(v.get("gasto"))
            util = _money(v.get("ganancia_neta")) if "ganancia_neta" in v else (ingreso - gasto)
            ws_ven.append(
                [
                    _first(v.get("fecha")),
                    _safe_str(v.get("tipo_mango")),
                    int(v.get("num_cajas") or 0),
                    _money(v.get("precio_por_caja")),
                    ingreso,
                    gasto,
                    util,
                ]
            )
        for row_cells in ws_ven.iter_rows(min_row=2):
            # cajas enteras
            row_cells[2].number_format = "0"
            # dinero
            for col in (4, 5, 6, 7):
                row_cells[col - 1].number_format = "#,##0.00"

        # NOTA: write_only=True limita autofiltros y bordes por rango; se prioriza rendimiento.
        # Aun así, podemos congelar paneles:
        ws_inv.freeze_panes = "A2"
        ws_ven.freeze_panes = "A2"
        ws_resumen.freeze_panes = "A4"

        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()

    # =========================
    # TEMPORADA
    # =========================

    @staticmethod
    def generar_pdf_temporada(reporte_data: Dict[str, Any]) -> bytes:
        buffer = BytesIO()
        doc = _pdf_doc(buffer)
        title_style, heading_style, note_style = _pdf_styles()

        story: List[Any] = []

        story.append(Paragraph("REPORTE DE PRODUCCIÓN - TEMPORADA COMPLETA", title_style))
        story.append(Spacer(1, 10))

        info = reporte_data.get("informacion_general", {}) or {}
        res = reporte_data.get("resumen_ejecutivo", {}) or {}

        story.append(Paragraph("INFORMACIÓN GENERAL", heading_style))
        info_data = [
            ["Huerta:", f"{_safe_str(info.get('huerta_nombre'))} ({_safe_str(info.get('huerta_tipo'))})"],
            ["Propietario:", _safe_str(info.get("propietario"))],
            ["Temporada:", _safe_str(info.get("temporada_año"))],
            ["Total Cosechas:", _safe_str(info.get("total_cosechas"))],
            ["Estado:", _safe_str(info.get("estado"))],
            ["Hectáreas:", f"{_money(info.get('hectareas')):.2f} ha"],
        ]
        t_info = Table(info_data, colWidths=[2 * inch, 4 * inch])
        t_info.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        story.append(t_info)
        story.append(Spacer(1, 10))

        story.append(Paragraph("RESUMEN EJECUTIVO", heading_style))
        res_data = [
            ["Concepto", "Valor"],
            ["Inversión Total", f"${_money(res.get('inversion_total')):,.2f}"],
            ["Ventas Totales", f"${_money(res.get('ventas_totales')):,.2f}"],
            ["Ganancia Neta", f"${_money(res.get('ganancia_neta')):,.2f}"],
            ["ROI Temporada", f"{_pct(res.get('roi_temporada')):.1f}%"],
            ["Productividad", f"{_money(res.get('productividad')):.1f} cajas/ha"],
            ["Cajas Totales", _safe_str(res.get("cajas_totales"))],
        ]
        t_res = Table(res_data, colWidths=[3 * inch, 2.2 * inch], repeatRows=1)
        t_res.setStyle(_table_style_header(colors.darkblue))
        t_res.setStyle(_table_style_body())
        story.append(t_res)
        story.append(Spacer(1, 10))

        story.append(Paragraph("COMPARATIVO POR COSECHA", heading_style))
        comp_headers = ["Cosecha", "Inversión", "Ventas", "Ganancia", "ROI", "Cajas"]
        comp_rows = [comp_headers]
        for c in reporte_data.get("comparativo_cosechas", []) or []:
            comp_rows.append(
                [
                    _safe_str(c.get("nombre")),
                    f"${_money(c.get('inversion')):,.2f}",
                    f"${_money(c.get('ventas')):,.2f}",
                    f"${_money(c.get('ganancia')):,.2f}",
                    f"{_pct(c.get('roi')):.1f}%",
                    _safe_str(c.get("cajas")),
                ]
            )

        if len(comp_rows) == 1:
            story.append(Paragraph("Sin cosechas activas.", note_style))
        else:
            header = comp_rows[0]
            body = comp_rows[1:]
            for i, chunk in enumerate(_chunk_rows(body, 800)):
                t = Table(
                    [header] + chunk,
                    colWidths=[1.6 * inch, 1.2 * inch, 1.2 * inch, 1.2 * inch, 0.9 * inch, 0.8 * inch],
                    repeatRows=1,
                    splitByRow=True,
                )
                t.setStyle(_table_style_header(colors.darkgreen))
                t.setStyle(_table_style_body())
                story.append(t)
                if i < (len(body) - 1) // 800:
                    story.append(PageBreak())

        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def generar_excel_temporada(reporte_data: Dict[str, Any]) -> bytes:
        wb = Workbook(write_only=True)

        ws = wb.create_sheet("Resumen Ejecutivo")
        _ws_header(ws, "REPORTE DE PRODUCCIÓN - TEMPORADA COMPLETA", merge_to_col=6)

        info = reporte_data.get("informacion_general", {}) or {}
        res = reporte_data.get("resumen_ejecutivo", {}) or {}

        row = 3
        _ws_section_title(ws, row, "INFORMACIÓN GENERAL")
        info_rows = [
            ("Huerta", f"{_safe_str(info.get('huerta_nombre'))} ({_safe_str(info.get('huerta_tipo'))})"),
            ("Propietario", _safe_str(info.get("propietario"))),
            ("Temporada", _safe_str(info.get("temporada_año"))),
            ("Total Cosechas", _safe_str(info.get("total_cosechas"))),
            ("Estado", _safe_str(info.get("estado"))),
            ("Hectáreas", f"{_money(info.get('hectareas')):.2f} ha"),
        ]
        for label, value in info_rows:
            row += 1
            ws.append([label, value])
            ws.cell(row=row, column=1).font = Font(bold=True)

        row += 2
        _ws_section_title(ws, row, "RESUMEN EJECUTIVO")
        res_rows = [
            ("Inversión Total", _money(res.get("inversion_total"))),
            ("Ventas Totales", _money(res.get("ventas_totales"))),
            ("Ganancia Neta", _money(res.get("ganancia_neta"))),
            ("ROI Temporada (%)", _pct(res.get("roi_temporada"))),
            ("Productividad (cajas/ha)", _money(res.get("productividad"))),
            ("Cajas Totales", _money(res.get("cajas_totales"))),
        ]
        for label, value in res_rows:
            row += 1
            ws.append([label, value])
            ws.cell(row=row, column=1).font = Font(bold=True)
            if isinstance(value, (int, float)) and "ROI" not in label:
                ws.cell(row=row, column=2).number_format = "#,##0.00"

        # Comparativo por Cosecha (sheet aparte para grandes volúmenes)
        ws_comp = wb.create_sheet("Comparativo Cosechas")
        ws_comp.append(["Cosecha", "Inversión", "Ventas", "Ganancia", "ROI (%)", "Cajas"])
        for cell in ws_comp[1]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")

        for c in (reporte_data.get("comparativo_cosechas") or []):
            ws_comp.append(
                [
                    _safe_str(c.get("nombre")),
                    _money(c.get("inversion")),
                    _money(c.get("ventas")),
                    _money(c.get("ganancia")),
                    _pct(c.get("roi")),
                    _money(c.get("cajas")),
                ]
            )
        for row_cells in ws_comp.iter_rows(min_row=2):
            for col in (2, 3, 4, 6):
                row_cells[col - 1].number_format = "#,##0.00"

        ws.freeze_panes = "A4"
        ws_comp.freeze_panes = "A2"

        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()

    # =========================
    # PERFIL HUERTA
    # =========================

    @staticmethod
    def generar_pdf_perfil_huerta(reporte_data: Dict[str, Any]) -> bytes:
        buffer = BytesIO()
        doc = _pdf_doc(buffer)
        title_style, heading_style, note_style = _pdf_styles()

        story: List[Any] = []

        story.append(Paragraph("PERFIL HISTÓRICO DE HUERTA", title_style))
        story.append(Spacer(1, 10))

        info = reporte_data.get("informacion_general", {}) or {}

        story.append(Paragraph("INFORMACIÓN GENERAL", heading_style))
        info_data = [
            ["Huerta:", f"{_safe_str(info.get('huerta_nombre'))} ({_safe_str(info.get('huerta_tipo'))})"],
            ["Propietario:", _safe_str(info.get("propietario"))],
            ["Ubicación:", _safe_str(info.get("ubicacion"))],
            ["Hectáreas:", f"{_money(info.get('hectareas')):.2f} ha"],
            ["Variedades:", _safe_str(info.get("variedades"))],
            ["Años de Operación:", _safe_str(info.get("años_operacion"))],
            ["Temporadas Analizadas:", _safe_str(info.get("temporadas_analizadas"))],
        ]
        t_info = Table(info_data, colWidths=[2 * inch, 4 * inch])
        t_info.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
                    ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ]
            )
        )
        story.append(t_info)
        story.append(Spacer(1, 10))

        # Resumen histórico (paginado)
        story.append(Paragraph("RESUMEN HISTÓRICO", heading_style))
        hist_headers = ["Año", "Inversión", "Ventas", "Ganancia", "ROI", "Productividad", "Cosechas"]
        hist_rows = [hist_headers]
        for d in reporte_data.get("resumen_historico", []) or []:
            hist_rows.append(
                [
                    _safe_str(d.get("año")),
                    f"${_money(d.get('inversion')):,.2f}",
                    f"${_money(d.get('ventas')):,.2f}",
                    f"${_money(d.get('ganancia')):,.2f}",
                    f"{_pct(d.get('roi')):.1f}%",
                    f"{_money(d.get('productividad'))} cajas",
                    _safe_str(d.get("cosechas_count")),
                ]
            )
        if len(hist_rows) == 1:
            story.append(Paragraph("Sin datos históricos.", note_style))
        else:
            header = hist_rows[0]
            body = hist_rows[1:]
            for i, chunk in enumerate(_chunk_rows(body, 800)):
                t = Table(
                    [header] + chunk,
                    colWidths=[0.8 * inch, 1.2 * inch, 1.2 * inch, 1.2 * inch, 0.8 * inch, 1.2 * inch, 0.8 * inch],
                    repeatRows=1,
                    splitByRow=True,
                )
                t.setStyle(_table_style_header(colors.darkblue))
                t.setStyle(_table_style_body())
                story.append(t)
                if i < (len(body) - 1) // 800:
                    story.append(PageBreak())

        # Análisis de eficiencia (si existe)
        ef = reporte_data.get("analisis_eficiencia") or {}
        story.append(Spacer(1, 10))
        story.append(Paragraph("ANÁLISIS DE EFICIENCIA", heading_style))
        ef_data = [
            ["Métrica", "Valor"],
            [
                "Mejor Temporada",
                f"{_safe_str(ef.get('mejor_temporada', {}).get('año'))} "
                f"(ROI: {_pct(ef.get('mejor_temporada', {}).get('roi')):.1f}%)",
            ],
            [
                "Peor Temporada",
                f"{_safe_str(ef.get('peor_temporada', {}).get('año'))} "
                f"(ROI: {_pct(ef.get('peor_temporada', {}).get('roi')):.1f}%)",
            ],
            ["ROI Promedio Histórico", f"{_pct(ef.get('roi_promedio_historico')):.1f}%"],
            ["Variabilidad ROI", f"±{_pct(ef.get('variabilidad_roi')):.1f}%"],
            ["Tendencia", _safe_str(ef.get("tendencia"))],
        ]
        t_ef = Table(ef_data, colWidths=[3 * inch, 3 * inch], repeatRows=1)
        t_ef.setStyle(_table_style_header(colors.darkgreen))
        t_ef.setStyle(_table_style_body())
        story.append(t_ef)

        # Proyecciones (si existen)
        pr = reporte_data.get("proyecciones") or {}
        story.append(Spacer(1, 10))
        story.append(Paragraph("PROYECCIONES", heading_style))
        pr_data = [
            ["Proyección de Ventas Próx. Temporada", f"${_money(pr.get('proyeccion_proxima_temporada')):,.2f}"],
            ["ROI Esperado", f"{_pct(pr.get('roi_esperado')):.1f}%"],
            ["Recomendaciones", ", ".join([_safe_str(x) for x in (pr.get("recomendaciones") or [])]) or "-"],
            ["Alertas", ", ".join([_safe_str(x) for x in (pr.get("alertas") or [])]) or "-"],
        ]
        t_pr = Table(pr_data, colWidths=[3 * inch, 3 * inch], repeatRows=1)
        t_pr.setStyle(_table_style_header(HexColor("#9E480E")))
        t_pr.setStyle(_table_style_body())
        story.append(t_pr)

        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def generar_excel_perfil_huerta(reporte_data: Dict[str, Any]) -> bytes:
        wb = Workbook(write_only=True)

        ws = wb.create_sheet("Resumen Histórico")
        _ws_header(ws, "PERFIL HISTÓRICO DE HUERTA", merge_to_col=7)

        info = reporte_data.get("informacion_general", {}) or {}

        row = 3
        _ws_section_title(ws, row, "INFORMACIÓN GENERAL")
        info_rows = [
            ("Huerta", f"{_safe_str(info.get('huerta_nombre'))} ({_safe_str(info.get('huerta_tipo'))})"),
            ("Propietario", _safe_str(info.get("propietario"))),
            ("Ubicación", _safe_str(info.get("ubicacion"))),
            ("Hectáreas", f"{_money(info.get('hectareas')):.2f} ha"),
            ("Variedades", _safe_str(info.get("variedades"))),
            ("Años de Operación", _safe_str(info.get("años_operacion"))),
            ("Temporadas Analizadas", _safe_str(info.get("temporadas_analizadas"))),
        ]
        for label, value in info_rows:
            row += 1
            ws.append([label, value])
            ws.cell(row=row, column=1).font = Font(bold=True)

        row += 2
        _ws_section_title(ws, row, "RESUMEN HISTÓRICO")
        headers = ["Año", "Inversión", "Ventas", "Ganancia", "ROI (%)", "Productividad", "Cosechas"]
        row += 1
        ws.append(headers)
        for i, h in enumerate(headers, start=1):
            c = ws.cell(row=row, column=i)
            c.font = Font(bold=True, color="FFFFFF")
            c.fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")

        for d in (reporte_data.get("resumen_historico") or []):
            ws.append(
                [
                    _safe_str(d.get("año")),
                    _money(d.get("inversion")),
                    _money(d.get("ventas")),
                    _money(d.get("ganancia")),
                    _pct(d.get("roi")),
                    _money(d.get("productividad")),
                    _safe_str(d.get("cosechas_count")),
                ]
            )

        # Formatos numéricos
        # Nota: en write_only no podemos iterar con total libertad por celdas ya "escritas";
        # este formateo es mejor hacerlo en modo normal, pero priorizamos rendimiento y tamaño.
        # Como alternativa, añadimos otra hoja con análisis (opcional).
        ws.freeze_panes = "A5"

        # Hoja Proyecciones (si existen)
        pr = reporte_data.get("proyecciones") or {}
        ws2 = wb.create_sheet("Proyecciones")
        _ws_header(ws2, "Proyecciones")
        ws2.append(["Métrica", "Valor"])
        for cell in ws2[2]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="9E480E", end_color="9E480E", fill_type="solid")
        ws2.append(["Proyección Ventas Próx. Temporada", _money(pr.get("proyeccion_proxima_temporada"))])
        ws2.append(["ROI Esperado (%)", _pct(pr.get("roi_esperado"))])
        ws2.append(["Recomendaciones", ", ".join([_safe_str(x) for x in (pr.get("recomendaciones") or [])]) or "-"])
        ws2.append(["Alertas", ", ".join([_safe_str(x) for x in (pr.get("alertas") or [])]) or "-"])

        ws2.freeze_panes = "A3"

        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()
