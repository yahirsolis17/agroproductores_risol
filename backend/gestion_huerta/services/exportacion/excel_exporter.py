# -*- coding: utf-8 -*-
from __future__ import annotations

from io import BytesIO
from typing import Dict, Any, List, Optional

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Border, Side
from openpyxl.worksheet.worksheet import Worksheet
from openpyxl.cell.cell import WriteOnlyCell

# =========================
# Utilidades Excel (write_only-safe)
# =========================
def _money(x: Any) -> float:
    try: return float(x or 0)
    except Exception: return 0.0

def _pct(x: Any) -> float:
    try: return float(x or 0)
    except Exception: return 0.0

def _safe_str(x: Any) -> str:
    return "" if x is None else str(x)

def _first(s: str, n: int = 10) -> str:
    return _safe_str(s)[:n] if s else ""

def _woc(ws: Worksheet, value, font: Optional[Font] = None, fill: Optional[PatternFill] = None, number_format: Optional[str] = None):
    c = WriteOnlyCell(ws, value=value)
    if font: c.font = font
    if fill: c.fill = fill
    if number_format: c.number_format = number_format
    return c

def _ws_header(ws: Worksheet, title: str, merge_to_col: int = 6):
    is_write_only = getattr(ws.parent, "write_only", False)
    if is_write_only:
        title_cell = _woc(ws, title, font=Font(bold=True, size=16))
        pad = [WriteOnlyCell(ws, value="") for _ in range(max(0, merge_to_col - 1))]
        ws.append([title_cell] + pad)
    else:
        ws["A1"] = title; ws["A1"].font = Font(bold=True, size=16)
        if merge_to_col and merge_to_col > 1:
            end_col_letter = chr(ord("A") + merge_to_col - 1)
            ws.merge_cells(f"A1:{end_col_letter}1")

def _ws_section_title(ws: Worksheet, row: int, text: str):
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
    is_write_only = getattr(ws.parent, "write_only", False)
    if is_write_only:
        ws.append([_woc(ws, text, font=header_font, fill=header_fill)])
    else:
        ws[f"A{row}"] = text
        ws[f"A{row}"].font = header_font
        ws[f"A{row}"].fill = header_fill

def _apply_border(ws: Worksheet, cell_range: str):
    thin = Side(style="thin", color="000000")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    for row in ws[cell_range]:
        for cell in row:
            cell.border = border

# =========================
# Exportador Excel por entidad
# =========================
class ExcelExporter:
    @staticmethod
    def generar_excel_cosecha(reporte_data: Dict[str, Any]) -> bytes:
        wb = Workbook(write_only=True)

        header_font = Font(bold=True, color="FFFFFF")
        blue_fill   = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        purple_fill = PatternFill(start_color="7030A0", end_color="7030A0", fill_type="solid")

        ws_resumen = wb.create_sheet("Resumen")
        _ws_header(ws_resumen, "REPORTE DE PRODUCCIÓN - COSECHA INDIVIDUAL", merge_to_col=6)

        info = reporte_data.get("informacion_general", {}) or {}
        resumen = reporte_data.get("resumen_financiero", {}) or {}

        fi = _first(info.get("fecha_inicio")); ff = _first(info.get("fecha_fin"))
        periodo_txt = _safe_str(info.get("periodo") or (f"{fi} - {ff}" if (fi or ff) else ""))

        row = 3
        _ws_section_title(ws_resumen, row, "INFORMACIÓN GENERAL")
        info_data = [
            ("Huerta", f"{_safe_str(info.get('huerta_nombre'))} ({_safe_str(info.get('huerta_tipo'))})"),
            ("Ubicación", _safe_str(info.get("ubicacion"))),
            ("Propietario", _safe_str(info.get("propietario"))),
            ("Temporada", _safe_str(info.get("temporada_año"))),
            ("Cosecha", _safe_str(info.get("cosecha_nombre"))),
            ("Período", periodo_txt),
            ("Estado", _safe_str(info.get("estado"))),
            ("Hectáreas", f"{_money(info.get('hectareas')):.2f} ha"),
        ]
        for label, value in info_data:
            row += 1
            ws_resumen.append([_woc(ws_resumen, label, font=Font(bold=True)), _woc(ws_resumen, value)])

        row += 2
        _ws_section_title(ws_resumen, row, "RESUMEN FINANCIERO")
        resumen_rows = [
            ("Total Inversiones", _money(resumen.get("total_inversiones")), "#,##0.00"),
            ("Total Ventas", _money(resumen.get("total_ventas")), "#,##0.00"),
            ("Gastos de Venta", _money(resumen.get("total_gastos_venta")), "#,##0.00"),
            ("Ganancia Bruta", _money(resumen.get("ganancia_bruta")), "#,##0.00"),
            ("Ganancia Neta", _money(resumen.get("ganancia_neta")), "#,##0.00"),
            ("ROI (%)", _pct(resumen.get("roi_porcentaje")), "0.0"),
            ("Ganancia por Hectárea", _money(resumen.get("ganancia_por_hectarea")), "#,##0.00"),
        ]
        for label, value, fmt in resumen_rows:
            ws_resumen.append([_woc(ws_resumen, label, font=Font(bold=True)), _woc(ws_resumen, value, number_format=fmt)])

        ws_resumen.freeze_panes = "A4"

        ws_inv = wb.create_sheet("Inversiones")
        ws_inv.append([
            _woc(ws_inv, "Fecha",      font=header_font, fill=blue_fill),
            _woc(ws_inv, "Categoría",  font=header_font, fill=blue_fill),
            _woc(ws_inv, "Insumos",    font=header_font, fill=blue_fill),
            _woc(ws_inv, "Mano Obra",  font=header_font, fill=blue_fill),
            _woc(ws_inv, "Total",      font=header_font, fill=blue_fill),
            _woc(ws_inv, "Descripción",font=header_font, fill=blue_fill),
        ])
        for inv in reporte_data.get("detalle_inversiones", []) or []:
            ws_inv.append([
                _woc(ws_inv, _first(inv.get("fecha"))),
                _woc(ws_inv, _safe_str(inv.get("categoria") or "Sin categoría")),
                _woc(ws_inv, _money(inv.get("gastos_insumos")),   number_format="#,##0.00"),
                _woc(ws_inv, _money(inv.get("gastos_mano_obra")), number_format="#,##0.00"),
                _woc(ws_inv, _money(inv.get("total")),            number_format="#,##0.00"),
                _woc(ws_inv, _safe_str(inv.get("descripcion"))),
            ])
        ws_inv.freeze_panes = "A2"

        ws_ven = wb.create_sheet("Ventas")
        ws_ven.append([
            _woc(ws_ven, "Fecha",        font=header_font, fill=purple_fill),
            _woc(ws_ven, "Variedad",     font=header_font, fill=purple_fill),
            _woc(ws_ven, "Cajas",        font=header_font, fill=purple_fill),
            _woc(ws_ven, "Precio/Caja",  font=header_font, fill=purple_fill),
            _woc(ws_ven, "Total",        font=header_font, fill=purple_fill),
            _woc(ws_ven, "Gasto",        font=header_font, fill=purple_fill),
            _woc(ws_ven, "Utilidad Neta",font=header_font, fill=purple_fill),
        ])
        for v in reporte_data.get("detalle_ventas", []) or []:
            ingreso = _money(v.get("total_venta")); gasto = _money(v.get("gasto"))
            util = _money(v.get("ganancia_neta")) if "ganancia_neta" in v else (ingreso - gasto)
            ws_ven.append([
                _woc(ws_ven, _first(v.get("fecha"))),
                _woc(ws_ven, _safe_str(v.get("tipo_mango"))),
                _woc(ws_ven, int(v.get("num_cajas") or 0),       number_format="0"),
                _woc(ws_ven, _money(v.get("precio_por_caja")),   number_format="#,##0.00"),
                _woc(ws_ven, ingreso,                             number_format="#,##0.00"),
                _woc(ws_ven, gasto,                               number_format="#,##0.00"),
                _woc(ws_ven, util,                                number_format="#,##0.00"),
            ])
        ws_ven.freeze_panes = "A2"

        buffer = BytesIO(); wb.save(buffer); buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def generar_excel_temporada(reporte_data: Dict[str, Any]) -> bytes:
        wb = Workbook(write_only=True)

        header_font = Font(bold=True, color="FFFFFF")
        blue_fill   = PatternFill(start_color="366092", end_color="366092", fill_type="solid")

        ws = wb.create_sheet("Resumen Ejecutivo")
        _ws_header(ws, "REPORTE DE PRODUCCIÓN - TEMPORADA COMPLETA", merge_to_col=6)

        info = reporte_data.get("informacion_general", {}) or {}
        res = reporte_data.get("resumen_ejecutivo", {}) or {}

        fi = _first(info.get("fecha_inicio")); ff = _first(info.get("fecha_fin"))
        periodo_txt = _safe_str(info.get("periodo") or (f"{fi} - {ff}" if (fi or ff) else ""))

        row = 3
        _ws_section_title(ws, row, "INFORMACIÓN GENERAL")
        info_rows = [
            ("Huerta", f"{_safe_str(info.get('huerta_nombre'))} ({_safe_str(info.get('huerta_tipo'))})"),
            ("Ubicación", _safe_str(info.get("ubicacion"))),
            ("Propietario", _safe_str(info.get("propietario"))),
            ("Temporada", _safe_str(info.get("temporada_año"))),
            ("Período", periodo_txt),
            ("Estado", _safe_str(info.get("estado"))),
            ("Hectáreas", f"{_money(info.get('hectareas')):.2f} ha"),
            ("Total Cosechas", _safe_str(info.get("total_cosechas"))),
        ]
        for label, value in info_rows:
            row += 1
            ws.append([_woc(ws, label, font=Font(bold=True)), _woc(ws, value)])

        row += 2
        _ws_section_title(ws, row, "RESUMEN EJECUTIVO")
        res_rows = [
            ("Inversión Total", _money(res.get("inversion_total")), "#,##0.00"),
            ("Ventas Totales", _money(res.get("ventas_totales")), "#,##0.00"),
            ("Ganancia Neta", _money(res.get("ganancia_neta")), "#,##0.00"),
            ("ROI Temporada (%)", _pct(res.get("roi_temporada")), "0.0"),
            ("Productividad (cajas/ha)", _money(res.get("productividad")), "#,##0.00"),
            ("Cajas Totales", _money(res.get("cajas_totales")), "0"),
        ]
        for label, value, fmt in res_rows:
            ws.append([_woc(ws, label, font=Font(bold=True)), _woc(ws, value, number_format=fmt)])
        ws.freeze_panes = "A4"

        ws_comp = wb.create_sheet("Comparativo Cosechas")
        ws_comp.append([
            _woc(ws_comp, "Cosecha",  font=header_font, fill=blue_fill),
            _woc(ws_comp, "Inversión",font=header_font, fill=blue_fill),
            _woc(ws_comp, "Ventas",   font=header_font, fill=blue_fill),
            _woc(ws_comp, "Ganancia", font=header_font, fill=blue_fill),
            _woc(ws_comp, "ROI (%)",  font=header_font, fill=blue_fill),
            _woc(ws_comp, "Cajas",    font=header_font, fill=blue_fill),
        ])
        for c in (reporte_data.get("comparativo_cosechas") or []):
            ws_comp.append([
                _woc(ws_comp, _safe_str(c.get("nombre"))),
                _woc(ws_comp, _money(c.get("inversion")), number_format="#,##0.00"),
                _woc(ws_comp, _money(c.get("ventas")),    number_format="#,##0.00"),
                _woc(ws_comp, _money(c.get("ganancia")),  number_format="#,##0.00"),
                _woc(ws_comp, _pct(c.get("roi")),         number_format="0.0"),
                _woc(ws_comp, _money(c.get("cajas")),     number_format="0"),
            ])
        ws_comp.freeze_panes = "A2"

        buffer = BytesIO(); wb.save(buffer); buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def generar_excel_perfil_huerta(reporte_data: Dict[str, Any]) -> bytes:
        wb = Workbook(write_only=True)

        header_font = Font(bold=True, color="FFFFFF")
        blue_fill   = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        orange_fill = PatternFill(start_color="9E480E", end_color="9E480E", fill_type="solid")

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
            ws.append([_woc(ws, label, font=Font(bold=True)), _woc(ws, value)])

        row += 2
        _ws_section_title(ws, row, "RESUMEN HISTÓRICO")
        ws.append([
            _woc(ws, "Año",           font=header_font, fill=blue_fill),
            _woc(ws, "Inversión",     font=header_font, fill=blue_fill),
            _woc(ws, "Ventas",        font=header_font, fill=blue_fill),
            _woc(ws, "Ganancia",      font=header_font, fill=blue_fill),
            _woc(ws, "ROI (%)",       font=header_font, fill=blue_fill),
            _woc(ws, "Productividad", font=header_font, fill=blue_fill),
            _woc(ws, "Cosechas",      font=header_font, fill=blue_fill),
        ])
        for d in (reporte_data.get("resumen_historico") or []):
            ws.append([
                _woc(ws, _safe_str(d.get("año"))),
                _woc(ws, _money(d.get("inversion")),     number_format="#,##0.00"),
                _woc(ws, _money(d.get("ventas")),        number_format="#,##0.00"),
                _woc(ws, _money(d.get("ganancia")),      number_format="#,##0.00"),
                _woc(ws, _pct(d.get("roi")),             number_format="0.0"),
                _woc(ws, _money(d.get("productividad")), number_format="#,##0.00"),
                _woc(ws, _safe_str(d.get("cosechas_count"))),
            ])
        ws.freeze_panes = "A5"

        pr = reporte_data.get("proyecciones") or {}
        ws2 = wb.create_sheet("Proyecciones")
        _ws_header(ws2, "Proyecciones")
        ws2.append([_woc(ws2, "Métrica", font=header_font, fill=orange_fill), _woc(ws2, "Valor", font=header_font, fill=orange_fill)])
        ws2.append([_woc(ws2, "Proyección Ventas Próx. Temporada"), _woc(ws2, _money(pr.get("proyeccion_proxima_temporada")), number_format="#,##0.00")])
        ws2.append([_woc(ws2, "ROI Esperado (%)"), _woc(ws2, _pct(pr.get("roi_esperado")), number_format="0.0")])
        ws2.append([_woc(ws2, "Recomendaciones"), _woc(ws2, ", ".join([_safe_str(x) for x in (pr.get("recomendaciones") or [])]) or "-")])
        ws2.append([_woc(ws2, "Alertas"), _woc(ws2, ", ".join([_safe_str(x) for x in (pr.get("alertas") or [])]) or "-")])
        ws2.freeze_panes = "A3"

        buffer = BytesIO(); wb.save(buffer); buffer.seek(0)
        return buffer.getvalue()
