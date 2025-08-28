# services/exportacion/pdf_exporter.py

# -*- coding: utf-8 -*-
from __future__ import annotations

from io import BytesIO
from typing import Dict, Any, List, Optional
from functools import partial
import logging

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak

logger = logging.getLogger(__name__)

# =========================
# Utilidades PDF
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

def _chunk_rows(rows: List[List[Any]], size: int):
    for i in range(0, len(rows), size):
        yield rows[i : i + size]

def _table_style_header(bg: colors.Color) -> TableStyle:
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), bg),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
    ])

def _table_style_body(zebra=(colors.white, colors.lightgrey)) -> TableStyle:
    return TableStyle([
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("ALIGN", (0, 1), (-1, -1), "CENTER"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), zebra),
        ("GRID", (0, 0), (-1, -1), 1, colors.black),
    ])

def _pdf_doc(buffer: BytesIO) -> SimpleDocTemplate:
    return SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=0.75 * inch, leftMargin=0.5 * inch, rightMargin=0.5 * inch, bottomMargin=0.75 * inch,
    )

def _pdf_styles():
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("CustomTitle", parent=styles["Heading1"], fontSize=16, spaceAfter=20, alignment=1, textColor=HexColor("#2e7d32"))
    heading_style = ParagraphStyle("CustomHeading", parent=styles["Heading2"], fontSize=12, spaceAfter=10, textColor=HexColor("#0288d1"))
    note_style = ParagraphStyle("Note", parent=styles["Normal"], fontSize=8, textColor=colors.grey, spaceBefore=4, spaceAfter=4)
    return title_style, heading_style, note_style

def _pdf_header_footer(canvas, doc, title: str):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(HexColor("#2e7d32"))
    canvas.rect(0, height - 50, width, 50, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 14)
    canvas.drawString(40, height - 30, title)
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(colors.grey)
    canvas.drawString(40, 30, "Agroproductores Risol")
    canvas.drawRightString(width - 40, 30, f"Página {doc.page}")
    canvas.restoreState()

# ===================================================
# Integración opcional con WeasyPrint (reporting.py)
# ===================================================
def _try_weasy_from_reporting(kind: str, reporte_data: Dict[str, Any]) -> Optional[bytes]:
    try:
        from gestion_huerta.utils import reporting as rep  # type: ignore
    except Exception:
        return None
    meta = (reporte_data or {}).get("metadata", {}) or {}
    try:
        # 1) Prioriza funciones que rinden desde datos (una sola fuente de verdad)
        if kind == "cosecha" and hasattr(rep, "render_cosecha_pdf_from_data"):
            return rep.render_cosecha_pdf_from_data(reporte_data)
        if kind == "temporada" and hasattr(rep, "render_temporada_pdf_from_data"):
            return rep.render_temporada_pdf_from_data(reporte_data)
        if kind == "perfil_huerta" and hasattr(rep, "render_huerta_pdf_from_data"):
            return rep.render_huerta_pdf_from_data(reporte_data)

        # 2) Fallback legacy por ID (compatibilidad hacia atrás)
        if kind == "cosecha" and meta.get("cosecha_id"):
            return rep.render_cosecha_pdf(int(meta["cosecha_id"]))
        if kind == "temporada" and meta.get("temporada_id"):
            return rep.render_temporada_pdf(int(meta["temporada_id"]))
        if kind == "perfil_huerta":
            hid = meta.get("huerta_id") or meta.get("huerta_rentada_id")
            if hid: return rep.render_huerta_pdf(int(hid))
        return None
    except Exception as e:
        logger.debug("WeasyPrint fallback (%s) -> ReportLab. Motivo: %s", kind, e)
        return None

# =========================
# Exportador PDF por entidad
# =========================
class PDFExporter:
    @staticmethod
    def generar_pdf_cosecha(reporte_data: Dict[str, Any]) -> bytes:
        weasy = _try_weasy_from_reporting("cosecha", reporte_data)
        if weasy: return weasy

        buffer = BytesIO()
        doc = _pdf_doc(buffer)
        title_style, heading_style, note_style = _pdf_styles()
        story: List[Any] = [Paragraph("REPORTE DE COSECHA", title_style)]

        info = reporte_data.get("informacion_general", {}) or {}
        resumen = reporte_data.get("resumen_financiero", {}) or {}

        fi = _first(info.get("fecha_inicio")); ff = _first(info.get("fecha_fin"))
        periodo_txt = _safe_str(info.get("periodo") or (f"{fi} - {ff}" if (fi or ff) else ""))

        story.append(Paragraph("INFORMACIÓN GENERAL", heading_style))
        info_data = [
            ["Huerta:", f"{_safe_str(info.get('huerta_nombre'))} ({_safe_str(info.get('huerta_tipo'))})"],
            ["Ubicación:", _safe_str(info.get("ubicacion"))],
            ["Propietario:", _safe_str(info.get("propietario"))],
            ["Temporada:", _safe_str(info.get("temporada_año"))],
            ["Cosecha:", _safe_str(info.get("cosecha_nombre"))],
            ["Período:", periodo_txt],
            ["Estado:", _safe_str(info.get("estado"))],
            ["Hectáreas:", f"{_money(info.get('hectareas')):.2f} ha"],
        ]
        info_table = Table(info_data, colWidths=[2 * inch, 4 * inch], hAlign="LEFT")
        info_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
            ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 1, colors.black),
        ]))
        story += [info_table, Spacer(1, 10)]

        story.append(Paragraph("RESUMEN FINANCIERO", heading_style))
        flags = (reporte_data.get("flags") or {})
        if flags.get("tiene_perdida"):
            story.append(Paragraph("ALERTA: La cosecha presenta <b>ganancia neta negativa</b>.", note_style))

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
        res_table.setStyle(_table_style_header(HexColor("#2e7d32")))
        res_table.setStyle(_table_style_body())
        story += [res_table, Spacer(1, 10)]

        # (Opcional) bloque explicativo si existe
        exp = reporte_data.get("explicativo") or {}
        if exp:
            story.append(Paragraph("¿CÓMO SE CALCULAN?", heading_style))
            exp_data = [
                ["Ventas Brutas", f"${_money(exp.get('ventas_brutas')):,.2f}"],
                ["Gastos de Venta", f"${_money(exp.get('gastos_venta')):,.2f}"],
                ["Ventas Netas", f"${_money(exp.get('ventas_netas')):,.2f}"],
                ["Inversión Total", f"${_money(exp.get('inversion_total')):,.2f}"],
                ["Ganancia Neta", f"${_money(exp.get('ganancia_neta')):,.2f}"],
                ["ROI", f"{_pct(exp.get('roi_porcentaje')):.1f}%"],
            ]
            t_exp = Table([["Concepto", "Valor"]] + exp_data, colWidths=[3 * inch, 2.2 * inch], repeatRows=1)
            t_exp.setStyle(_table_style_header(HexColor("#455A64"))); t_exp.setStyle(_table_style_body())
            story += [t_exp, Spacer(1, 10)]

        inv_headers = ["Fecha", "Categoría", "Insumos", "Mano Obra", "Total", "Descripción"]
        inv_rows: List[List[Any]] = [inv_headers]
        for inv in reporte_data.get("detalle_inversiones", []) or []:
            inv_rows.append([
                _first(inv.get("fecha")),
                _safe_str(inv.get("categoria") or "Sin categoría"),
                f"${_money(inv.get('gastos_insumos')):,.2f}",
                f"${_money(inv.get('gastos_mano_obra')):,.2f}",
                f"${_money(inv.get('total')):,.2f}",
                _safe_str(inv.get("descripcion")),
            ])
        story.append(Paragraph("DETALLE DE INVERSIONES", heading_style))
        if len(inv_rows) == 1:
            story.append(Paragraph("Sin inversiones registradas.", note_style))
        else:
            header, body = inv_rows[0], inv_rows[1:]
            for i, chunk in enumerate(_chunk_rows(body, 800)):
                t = Table([header] + chunk,
                          colWidths=[1.0*inch, 1.5*inch, 1.1*inch, 1.1*inch, 1.1*inch, 1.4*inch],
                          repeatRows=1, splitByRow=True)
                t.setStyle(_table_style_header(HexColor("#0288d1")))
                t.setStyle(_table_style_body())
                t.setStyle(TableStyle([("ALIGN", (1,1), (1,-1), "LEFT"), ("ALIGN", (5,1), (5,-1), "LEFT")]))
                story.append(t)
                if i < (len(body) - 1) // 800: story.append(PageBreak())
        story.append(Spacer(1, 10))

        ven_headers = ["Fecha", "Variedad", "Cajas", "Precio/Caja", "Total", "Gasto", "Utilidad Neta"]
        ven_rows: List[List[Any]] = [ven_headers]
        for v in reporte_data.get("detalle_ventas", []) or []:
            ingreso = _money(v.get("total_venta")); gasto = _money(v.get("gasto"))
            util = _money(v.get("ganancia_neta")) if "ganancia_neta" in v else (ingreso - gasto)
            ven_rows.append([
                _first(v.get("fecha")),
                _safe_str(v.get("tipo_mango")),
                str(int(v.get("num_cajas") or 0)),
                f"${_money(v.get('precio_por_caja')):,.2f}",
                f"${ingreso:,.2f}",
                f"${gasto:,.2f}",
                f"${util:,.2f}",
            ])
        story.append(Paragraph("DETALLE DE VENTAS", heading_style))
        if len(ven_rows) == 1:
            story.append(Paragraph("Sin ventas registradas.", note_style))
        else:
            header, body = ven_rows[0], ven_rows[1:]
            for i, chunk in enumerate(_chunk_rows(body, 800)):
                t = Table([header] + chunk,
                          colWidths=[1.0*inch, 1.5*inch, 0.8*inch, 1.1*inch, 1.2*inch, 1.0*inch, 1.2*inch],
                          repeatRows=1, splitByRow=True)
                t.setStyle(_table_style_header(HexColor("#FF8C00")))
                t.setStyle(_table_style_body())
                t.setStyle(TableStyle([("ALIGN", (1,1), (1,-1), "LEFT")]))
                # Pintar en rojo utilidad negativa (col 6)
                styles = []
                for ridx, row in enumerate(chunk, start=1):
                    try:
                        util_txt = row[6]
                        util_val = float(str(util_txt).replace("$","").replace(",",""))
                        if util_val < 0:
                            styles.append(("TEXTCOLOR", (6, ridx), (6, ridx), colors.red))
                    except Exception:
                        pass
                if styles:
                    t.setStyle(TableStyle(styles))
                story.append(t)
                if i < (len(body) - 1) // 800: story.append(PageBreak())

        cats = reporte_data.get("analisis_categorias") or []
        if cats:
            story.append(Spacer(1, 10))
            story.append(Paragraph("ANÁLISIS DE CATEGORÍAS (Inversiones)", heading_style))
            data = [["Categoría", "Total", "%"]]
            for c in cats:
                data.append([_safe_str(c.get("categoria")), f"${_money(c.get('total')):,.2f}", f"{_pct(c.get('porcentaje')):.1f}%"])
            t = Table(data, colWidths=[2.5*inch, 1.6*inch, 0.8*inch], repeatRows=1)
            t.setStyle(_table_style_header(HexColor("#2F5597"))); t.setStyle(_table_style_body())
            story.append(t)

        vars_ = reporte_data.get("analisis_variedades") or []
        if vars_:
            story.append(Spacer(1, 10))
            story.append(Paragraph("ANÁLISIS DE VARIEDADES (Ventas)", heading_style))
            data = [["Variedad", "Cajas", "Precio Prom.", "Total", "%"]]
            for r in vars_:
                data.append([
                    _safe_str(r.get("variedad")),
                    str(int(r.get("total_cajas") or 0)),
                    f"${_money(r.get('precio_promedio')):,.2f}",
                    f"${_money(r.get('total_venta')):,.2f}",
                    f"{_pct(r.get('porcentaje')):.1f}%",
                ])
            t = Table(data, colWidths=[2.0*inch, 0.9*inch, 1.2*inch, 1.6*inch, 0.8*inch], repeatRows=1)
            t.setStyle(_table_style_header(HexColor("#7030A0"))); t.setStyle(_table_style_body())
            story.append(t)

        header = partial(_pdf_header_footer, title="Reporte de Cosecha")
        doc.build(story, onFirstPage=header, onLaterPages=header)
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def generar_pdf_temporada(reporte_data: Dict[str, Any]) -> bytes:
        weasy = _try_weasy_from_reporting("temporada", reporte_data)
        if weasy: return weasy

        buffer = BytesIO()
        doc = _pdf_doc(buffer)
        title_style, heading_style, note_style = _pdf_styles()
        story: List[Any] = [Paragraph("REPORTE DE TEMPORADA", title_style)]

        info = reporte_data.get("informacion_general", {}) or {}
        res = reporte_data.get("resumen_ejecutivo", {}) or {}

        fi = _first(info.get("fecha_inicio")); ff = _first(info.get("fecha_fin"))
        periodo_txt = _safe_str(info.get("periodo") or (f"{fi} - {ff}" if (fi or ff) else ""))

        story.append(Paragraph("INFORMACIÓN GENERAL", heading_style))
        info_data = [
            ["Huerta:", f"{_safe_str(info.get('huerta_nombre'))} ({_safe_str(info.get('huerta_tipo'))})"],
            ["Ubicación:", _safe_str(info.get("ubicacion"))],
            ["Propietario:", _safe_str(info.get("propietario"))],
            ["Temporada:", _safe_str(info.get("temporada_año"))],
            ["Período:", periodo_txt],
            ["Estado:", _safe_str(info.get("estado"))],
            ["Hectáreas:", f"{_money(info.get('hectareas')):.2f} ha"],
            ["Total Cosechas:", _safe_str(info.get("total_cosechas"))],
        ]
        t_info = Table(info_data, colWidths=[2 * inch, 4 * inch])
        t_info.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
            ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("GRID", (0, 0), (-1, -1), 1, colors.black),
        ]))
        story += [t_info, Spacer(1, 10)]

        story.append(Paragraph("RESUMEN EJECUTIVO", heading_style))
        flags = (reporte_data.get("flags") or {})
        if flags.get("tiene_perdida"):
            story.append(Paragraph("ALERTA: La temporada presenta <b>ganancia neta negativa</b>.", note_style))

        res_data = [
            ["Concepto", "Valor"],
            ["Inversión Total", f"${_money(res.get('inversion_total')):,.2f}"],
            ["Ventas Totales", f"${_money(res.get('ventas_totales')):,.2f}"],
            ["Gastos de Venta", f"${_money(res.get('total_gastos_venta')):,.2f}"],
            ["Ventas Netas", f"${_money(res.get('ventas_netas')):,.2f}"],
            ["Ganancia Neta", f"${_money(res.get('ganancia_neta')):,.2f}"],
            ["ROI Temporada", f"{_pct(res.get('roi_temporada')):.1f}%"],
            ["Productividad", f"{_money(res.get('productividad')):.1f} cajas/ha"],
            ["Cajas Totales", _safe_str(res.get("cajas_totales"))],
        ]
        t_res = Table(res_data, colWidths=[3 * inch, 2.2 * inch], repeatRows=1)
        t_res.setStyle(_table_style_header(HexColor("#2e7d32"))); t_res.setStyle(_table_style_body())
        story += [t_res, Spacer(1, 10)]

        # (Opcional) bloque explicativo si existe
        exp = reporte_data.get("explicativo") or {}
        if exp:
            story.append(Paragraph("¿CÓMO SE CALCULAN?", heading_style))
            exp_data = [
                ["Ventas Brutas", f"${_money(exp.get('ventas_brutas')):,.2f}"],
                ["Gastos de Venta", f"${_money(exp.get('gastos_venta')):,.2f}"],
                ["Ventas Netas", f"${_money(exp.get('ventas_netas')):,.2f}"],
                ["Inversión Total", f"${_money(exp.get('inversion_total')):,.2f}"],
                ["Ganancia Neta", f"${_money(exp.get('ganancia_neta')):,.2f}"],
                ["ROI", f"{_pct(exp.get('roi_porcentaje')):.1f}%"],
            ]
            t_exp = Table([["Concepto","Valor"]] + exp_data, colWidths=[3*inch, 2.2*inch], repeatRows=1)
            t_exp.setStyle(_table_style_header(HexColor("#455A64"))); t_exp.setStyle(_table_style_body())
            story += [t_exp, Spacer(1, 10)]

        story.append(Paragraph("COMPARATIVO POR COSECHA", heading_style))
        comp_headers = ["Cosecha", "Inversión", "Ventas", "Ganancia", "ROI", "Cajas"]
        comp_rows = [comp_headers]
        for c in reporte_data.get("comparativo_cosechas", []) or []:
            comp_rows.append([
                _safe_str(c.get("nombre")),
                f"${_money(c.get('inversion')):,.2f}",
                f"${_money(c.get('ventas')):,.2f}",
                f"${_money(c.get('ganancia')):,.2f}",
                f"{_pct(c.get('roi')):.1f}%",
                _safe_str(c.get("cajas")),
            ])
        if len(comp_rows) == 1:
            story.append(Paragraph("Sin cosechas activas.", note_style))
        else:
            header, body = comp_rows[0], comp_rows[1:]
            for i, chunk in enumerate(_chunk_rows(body, 800)):
                t = Table([header] + chunk,
                          colWidths=[1.6*inch, 1.2*inch, 1.2*inch, 1.2*inch, 0.9*inch, 0.8*inch],
                          repeatRows=1, splitByRow=True)
                t.setStyle(_table_style_header(HexColor("#0288d1"))); t.setStyle(_table_style_body())
                t.setStyle(TableStyle([("ALIGN", (0,1), (0,-1), "LEFT")]))
                story.append(t)
                if i < (len(body) - 1) // 800: story.append(PageBreak())

        header_fn = partial(_pdf_header_footer, title="Reporte de Temporada")
        doc.build(story, onFirstPage=header_fn, onLaterPages=header_fn)
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def generar_pdf_perfil_huerta(reporte_data: Dict[str, Any]) -> bytes:
        weasy = _try_weasy_from_reporting("perfil_huerta", reporte_data)
        if weasy: return weasy

        buffer = BytesIO()
        doc = _pdf_doc(buffer)
        title_style, heading_style, note_style = _pdf_styles()
        story: List[Any] = [Paragraph("PERFIL DE HUERTA", title_style)]

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
        t_info.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
            ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("GRID", (0, 0), (-1, -1), 1, colors.black),
        ]))
        story += [t_info, Spacer(1, 10)]

        story.append(Paragraph("RESUMEN HISTÓRICO", heading_style))
        hist_headers = ["Año", "Inversión", "Ventas", "Ganancia", "ROI", "Productividad", "Cosechas"]
        hist_rows = [hist_headers]
        for d in reporte_data.get("resumen_historico", []) or []:
            hist_rows.append([
                _safe_str(d.get("año")),
                f"${_money(d.get('inversion')):,.2f}",
                f"${_money(d.get('ventas')):,.2f}",
                f"${_money(d.get('ganancia')):,.2f}",
                f"{_pct(d.get('roi')):.1f}%",
                f"{_money(d.get('productividad'))} cajas",
                _safe_str(d.get("cosechas_count")),
            ])
        if len(hist_rows) == 1:
            story.append(Paragraph("Sin datos históricos.", note_style))
        else:
            header, body = hist_rows[0], hist_rows[1:]
            for i, chunk in enumerate(_chunk_rows(body, 800)):
                t = Table([header] + chunk,
                          colWidths=[0.8*inch, 1.2*inch, 1.2*inch, 1.2*inch, 0.8*inch, 1.2*inch, 0.8*inch],
                          repeatRows=1, splitByRow=True)
                t.setStyle(_table_style_header(HexColor("#2e7d32"))); t.setStyle(_table_style_body())
                story.append(t)
                if i < (len(body) - 1) // 800: story.append(PageBreak())

        ef = reporte_data.get("analisis_eficiencia") or {}
        story += [Spacer(1, 10), Paragraph("ANÁLISIS DE EFICIENCIA", heading_style)]
        ef_data = [
            ["Métrica", "Valor"],
            ["Mejor Temporada", f"{_safe_str(ef.get('mejor_temporada', {}).get('año'))} (ROI: {_pct(ef.get('mejor_temporada', {}).get('roi')):.1f}%)"],
            ["Peor Temporada", f"{_safe_str(ef.get('peor_temporada', {}).get('año'))} (ROI: {_pct(ef.get('peor_temporada', {}).get('roi')):.1f}%)"],
            ["ROI Promedio Histórico", f"{_pct(ef.get('roi_promedio_historico')):.1f}%"],
            ["Variabilidad ROI", f"±{_pct(ef.get('variabilidad_roi')):.1f}%"],
            ["Tendencia", _safe_str(ef.get("tendencia"))],
        ]
        t_ef = Table(ef_data, colWidths=[3 * inch, 3 * inch], repeatRows=1)
        t_ef.setStyle(_table_style_header(HexColor("#0288d1"))); t_ef.setStyle(_table_style_body())
        story.append(t_ef)

        pr = reporte_data.get("proyecciones") or {}
        story += [Spacer(1, 10), Paragraph("PROYECCIONES", heading_style)]
        pr_data = [
            ["Proyección de Ventas Próx. Temporada", f"${_money(pr.get('proyeccion_proxima_temporada')):,.2f}"],
            ["ROI Esperado", f"{_pct(pr.get('roi_esperado')):.1f}%"],
            ["Recomendaciones", ", ".join([_safe_str(x) for x in (pr.get("recomendaciones") or [])]) or "-"],
            ["Alertas", ", ".join([_safe_str(x) for x in (pr.get("alertas") or [])]) or "-"],
        ]
        t_pr = Table(pr_data, colWidths=[3 * inch, 3 * inch], repeatRows=1)
        t_pr.setStyle(_table_style_header(HexColor("#9E480E"))); t_pr.setStyle(_table_style_body())
        story.append(t_pr)

        header_fn = partial(_pdf_header_footer, title="Perfil de Huerta")
        doc.build(story, onFirstPage=header_fn, onLaterPages=header_fn)
        buffer.seek(0)
        return buffer.getvalue()
