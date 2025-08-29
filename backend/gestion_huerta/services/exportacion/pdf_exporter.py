# -*- coding: utf-8 -*-
from __future__ import annotations

from io import BytesIO
from typing import Dict, Any, List, Optional
from functools import partial
import logging
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

logger = logging.getLogger(__name__)

# =========================
# Marca / Tipografías / Paleta
# =========================
BRAND_PRIMARY = HexColor("#1a472a")
BRAND_SECONDARY = HexColor("#2e6b87")
BRAND_ACCENT = HexColor("#d4af37")
BRAND_LIGHT = HexColor("#f8f9fa")
BRAND_GREY = HexColor("#495057")
BRAND_SUCCESS = HexColor("#28a745")
BRAND_WARNING = HexColor("#ffc107")
BRAND_DANGER = HexColor("#dc3545")

GRADIENT_LIGHT = HexColor("#e9ecef")
GRADIENT_DARK = HexColor("#dee2e6")

_FONTS_READY = False
_FONT_REGULAR = "Helvetica"
_FONT_BOLD = "Helvetica-Bold"
_FONT_LIGHT = "Helvetica"

def _register_brand_fonts():
    global _FONTS_READY, _FONT_REGULAR, _FONT_BOLD, _FONT_LIGHT
    if _FONTS_READY:
        return

    candidates = [
        ("Roboto", "Roboto-Regular.ttf"),
        ("OpenSans", "OpenSans-Regular.ttf"),
        ("Lato", "Lato-Regular.ttf"),
        ("Montserrat", "Montserrat-Regular.ttf"),
        ("DejaVuSans", "DejaVuSans.ttf"),
        ("Arial", "Arial.ttf"),
    ]
    bold_candidates = [
        ("Roboto-Bold", "Roboto-Bold.ttf"),
        ("OpenSans-Bold", "OpenSans-Bold.ttf"),
        ("Lato-Bold", "Lato-Bold.ttf"),
        ("Montserrat-Bold", "Montserrat-Bold.ttf"),
        ("DejaVuSans-Bold", "DejaVuSans-Bold.ttf"),
        ("Arial-Bold", "Arial Bold.ttf"),
        ("Arial-Bold", "arialbd.ttf"),
    ]
    light_candidates = [
        ("Roboto-Light", "Roboto-Light.ttf"),
        ("OpenSans-Light", "OpenSans-Light.ttf"),
        ("Lato-Light", "Lato-Light.ttf"),
        ("Montserrat-Light", "Montserrat-Light.ttf"),
    ]

    common_paths = [
        "/usr/share/fonts/truetype/",
        "/usr/share/fonts/truetype/dejavu/",
        "/usr/local/share/fonts/",
        "C:/Windows/Fonts/",
        "/Library/Fonts/",
        "/System/Library/Fonts/",
    ]

    def try_register(name: str, filename: str) -> bool:
        for base in common_paths:
            path = base + filename
            try:
                pdfmetrics.registerFont(TTFont(name, path))
                return True
            except Exception:
                continue
        return False

    ok_reg = False
    for name, file in candidates:
        if try_register(name, file):
            _FONT_REGULAR = name
            ok_reg = True
            break

    ok_bold = False
    for name, file in bold_candidates:
        if try_register(name, file):
            _FONT_BOLD = name
            ok_bold = True
            break

    ok_light = False
    for name, file in light_candidates:
        if try_register(name, file):
            _FONT_LIGHT = name
            ok_light = True
            break

    _FONTS_READY = ok_reg or ok_bold

def _font_regular():
    return _FONT_REGULAR

def _font_bold():
    return _FONT_BOLD

def _font_light():
    return _FONT_LIGHT

# =========================
# Utilidades PDF
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

def _chunk_rows(rows: List[List[Any]], size: int):
    for i in range(0, len(rows), size):
        yield rows[i : i + size]

def _table_style_header(bg: colors.Color, text_color=colors.whitesmoke) -> TableStyle:
    return TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), bg),
        ("TEXTCOLOR", (0, 0), (-1, 0), text_color),
        ("FONTNAME", (0, 0), (-1, 0), _font_bold()),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 10),
        ("TOPPADDING", (0, 0), (-1, 0), 10),
        ("LEFTPADDING", (0, 0), (-1, 0), 8),
        ("RIGHTPADDING", (0, 0), (-1, 0), 8),
    ])

def _table_style_body(zebra=(colors.white, BRAND_LIGHT), text_color=BRAND_GREY) -> TableStyle:
    return TableStyle([
        ("FONTNAME", (0, 1), (-1, -1), _font_regular()),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("ALIGN", (0, 1), (-1, -1), "CENTER"),
        ("TEXTCOLOR", (0, 1), (-1, -1), text_color),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), zebra),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dee2e6")),
    ])

def _pdf_doc(buffer: BytesIO) -> SimpleDocTemplate:
    return SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=0.5 * inch, leftMargin=0.4 * inch, rightMargin=0.4 * inch, bottomMargin=0.5 * inch,
    )

def _pdf_styles():
    styles = getSampleStyleSheet()
    _register_brand_fonts()

    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Heading1"],
        fontName=_font_bold(),
        fontSize=18,
        spaceAfter=20,
        alignment=1,
        textColor=BRAND_PRIMARY,
        spaceBefore=10,
    )

    heading_style = ParagraphStyle(
        "CustomHeading",
        parent=styles["Heading2"],
        fontName=_font_bold(),
        fontSize=14,
        spaceAfter=12,
        textColor=BRAND_SECONDARY,
        spaceBefore=15,
        borderPadding=(5, 5, 5, 5),
        leftIndent=0,
    )

    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Heading3"],
        fontName=_font_regular(),
        fontSize=11,
        spaceAfter=8,
        textColor=BRAND_GREY,
        alignment=0,
    )

    note_style = ParagraphStyle(
        "Note",
        parent=styles["Normal"],
        fontName=_font_regular(),
        fontSize=9,
        textColor=BRAND_GREY,
        spaceBefore=4,
        spaceAfter=4,
        backColor=HexColor("#f8f9fa"),
        borderColor=HexColor("#dee2e6"),
        borderWidth=1,
        borderPadding=5,
    )

    highlight_style = ParagraphStyle(
        "Highlight",
        parent=styles["Normal"],
        fontName=_font_bold(),
        fontSize=10,
        textColor=BRAND_ACCENT,
        spaceAfter=6,
    )

    return title_style, heading_style, subtitle_style, note_style, highlight_style

def _pdf_header_footer(canvas, doc, title: str, subtitle: str = ""):
    canvas.saveState()
    width, height = A4

    # Header band
    canvas.setFillColor(BRAND_PRIMARY)
    canvas.rect(0, height - 70, width, 70, stroke=0, fill=1)

    # Separator
    canvas.setStrokeColor(BRAND_ACCENT)
    canvas.setLineWidth(2)
    canvas.line(40, height - 70, width - 40, height - 70)

    # Title
    canvas.setFillColor(colors.white)
    _register_brand_fonts()
    canvas.setFont(_font_bold(), 16)
    canvas.drawString(40, height - 35, title)

    if subtitle:
        canvas.setFont(_font_light(), 12)
        canvas.drawString(40, height - 55, subtitle)

    # Footer meta
    canvas.setFont(_font_regular(), 8)
    canvas.setFillColor(HexColor("#adb5bd"))
    fecha = datetime.now().strftime("%d/%m/%Y %H:%M")
    canvas.drawString(40, 25, f"Generado el: {fecha}")

    canvas.setFillColor(BRAND_GREY)
    canvas.drawString(40, 15, "Agroproductores Risol - Confidencial")

    # Página X
    try:
        page_num = canvas.getPageNumber()
    except Exception:
        page_num = 1
    canvas.drawRightString(width - 40, 15, f"Página {page_num}")

    # Bottom line
    canvas.setStrokeColor(GRADIENT_DARK)
    canvas.setLineWidth(0.5)
    canvas.line(40, 40, width - 40, 40)

    canvas.restoreState()

def _add_value_box(story, label: str, value: str, value_color: Color = BRAND_SECONDARY):
    data = [[label.upper(), value]]
    t = Table(data, colWidths=[2.5 * inch, 1.5 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), BRAND_LIGHT),
        ("BACKGROUND", (1, 0), (1, 0), HexColor("#f8f9fa")),
        ("TEXTCOLOR", (0, 0), (0, 0), BRAND_GREY),
        ("TEXTCOLOR", (1, 0), (1, 0), value_color),
        ("FONTNAME", (0, 0), (0, 0), _font_bold()),
        ("FONTNAME", (1, 0), (1, 0), _font_bold()),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (0, 0), (0, 0), "LEFT"),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("BOX", (0, 0), (-1, -1), 0.5, BRAND_LIGHT),
    ]))
    story.append(t)
    story.append(Spacer(1, 5))

def _try_weasy_from_reporting(kind: str, reporte_data: Dict[str, Any]) -> Optional[bytes]:
    try:
        from gestion_huerta.utils import reporting as rep  # type: ignore
    except Exception:
        return None
    meta = (reporte_data or {}).get("metadata", {}) or {}
    try:
        if kind == "cosecha" and hasattr(rep, "render_cosecha_pdf_from_data"):
            return rep.render_cosecha_pdf_from_data(reporte_data)
        if kind == "temporada" and hasattr(rep, "render_temporada_pdf_from_data"):
            return rep.render_temporada_pdf_from_data(reporte_data)
        if kind == "perfil_huerta" and hasattr(rep, "render_huerta_pdf_from_data"):
            return rep.render_huerta_pdf_from_data(reporte_data)

        if kind == "cosecha" and meta.get("cosecha_id"):
            return rep.render_cosecha_pdf(int(meta["cosecha_id"]))
        if kind == "temporada" and meta.get("temporada_id"):
            return rep.render_temporada_pdf(int(meta["temporada_id"]))
        if kind == "perfil_huerta":
            hid = meta.get("huerta_id") or meta.get("huerta_rentada_id")
            if hid:
                return rep.render_huerta_pdf(int(hid))
        return None
    except Exception as e:
        logger.debug("WeasyPrint fallback (%s) -> ReportLab. Motivo: %s", kind, e)
        return None

# ===== Helpers de resaltado negativo
def _styles_for_negative_column(body_chunk: List[List[Any]], col_index: int, parse_pct: bool = False):
    """
    Devuelve estilos para pintar en rojo valores negativos de la columna col_index.
    body_chunk son filas ya formateadas (strings tipo '$1,234.50' o '12.3%').
    """
    styles = []
    for ridx, row in enumerate(body_chunk, start=1):
        try:
            raw = str(row[col_index])
            if parse_pct:
                val = float(raw.replace("%", "").replace(" ", ""))
            else:
                val = float(raw.replace("$", "").replace(",", "").replace(" ", ""))
            if val < 0:
                styles.append(("TEXTCOLOR", (col_index, ridx), (col_index, ridx), BRAND_DANGER))
                styles.append(("FONTNAME", (col_index, ridx), (col_index, ridx), _font_bold()))
        except Exception:
            continue
    return styles

# =========================
# Exportador PDF por entidad
# =========================
class PDFExporter:
    @staticmethod
    def generar_pdf_cosecha(reporte_data: Dict[str, Any]) -> bytes:
        weasy = _try_weasy_from_reporting("cosecha", reporte_data)
        if weasy:
            return weasy

        buffer = BytesIO()
        doc = _pdf_doc(buffer)
        title_style, heading_style, subtitle_style, note_style, highlight_style = _pdf_styles()
        story: List[Any] = []

        # Portada
        story.append(Spacer(1, 2 * inch))
        story.append(Paragraph("REPORTE DE COSECHA", title_style))
        story.append(Spacer(1, 0.2 * inch))

        info = reporte_data.get("informacion_general", {}) or {}
        huerta_nombre = _safe_str(info.get("huerta_nombre"))
        temporada = _safe_str(info.get("temporada_año"))
        cosecha_nombre = _safe_str(info.get("cosecha_nombre"))

        story.append(Paragraph(f"{huerta_nombre} | {temporada}", subtitle_style))
        story.append(Paragraph(f"{cosecha_nombre}", subtitle_style))
        story.append(Spacer(1, 0.5 * inch))

        fi = _first(info.get("fecha_inicio")); ff = _first(info.get("fecha_fin"))
        periodo_txt = _safe_str(info.get("periodo") or (f"{fi} - {ff}" if (fi or ff) else ""))

        story.append(Paragraph(f"Período: {periodo_txt}", ParagraphStyle(
            "Detail", parent=subtitle_style, fontSize=10, textColor=BRAND_GREY
        )))

        story.append(PageBreak())

        # Información general
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
        from reportlab.platypus import Table
        t_info = Table(info_data, colWidths=[2 * inch, 4 * inch], hAlign="LEFT")
        t_info.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), BRAND_LIGHT),
            ("TEXTCOLOR", (0, 0), (0, -1), BRAND_GREY),
            ("TEXTCOLOR", (1, 0), (1, -1), BRAND_SECONDARY),
            ("ALIGN", (0, 0), (0, -1), "LEFT"),
            ("ALIGN", (1, 0), (1, -1), "LEFT"),
            ("FONTNAME", (0, 0), (0, -1), _font_bold()),
            ("FONTNAME", (1, 0), (1, -1), _font_regular()),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dee2e6")),
        ]))
        story += [t_info, Spacer(1, 15)]

        # Resumen financiero
        story.append(Paragraph("RESUMEN FINANCIERO", heading_style))
        resumen = reporte_data.get("resumen_financiero", {}) or {}

        flags = (reporte_data.get("flags") or {})
        if flags.get("tiene_perdida"):
            alert_style = ParagraphStyle(
                "Alert", parent=note_style, textColor=BRAND_DANGER, backColor=HexColor("#fff3cd")
            )
            story.append(Paragraph("ALERTA: La cosecha presenta <b>ganancia neta negativa</b>.", alert_style))
            story.append(Spacer(1, 10))

        ganancia_neta = _money(resumen.get('ganancia_neta'))
        roi = _pct(resumen.get('roi_porcentaje'))

        _add_value_box(story, "Inversión Total", f"${_money(resumen.get('total_inversiones')):,.2f}", BRAND_SECONDARY)
        _add_value_box(story, "Ventas Totales", f"${_money(resumen.get('total_ventas')):,.2f}", BRAND_SUCCESS)
        _add_value_box(story, "Ganancia Neta", f"${ganancia_neta:,.2f}",
                       BRAND_DANGER if ganancia_neta < 0 else BRAND_SUCCESS)
        _add_value_box(story, "ROI", f"{roi:.1f}%",
                       BRAND_DANGER if roi < 0 else BRAND_SUCCESS)
        _add_value_box(story, "Ganancia por Hectárea", f"${_money(resumen.get('ganancia_por_hectarea')):,.2f}",
                       BRAND_DANGER if _money(resumen.get('ganancia_por_hectarea')) < 0 else BRAND_SUCCESS)

        story.append(Spacer(1, 15))

        # Detalle de inversiones
        story.append(Paragraph("DETALLE DE INVERSIONES", heading_style))
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
        if len(inv_rows) == 1:
            story.append(Paragraph("Sin inversiones registradas.", note_style))
        else:
            header, body = inv_rows[0], inv_rows[1:]
            for i, chunk in enumerate(_chunk_rows(body, 20)):
                t = Table([header] + chunk,
                          colWidths=[0.9*inch, 1.4*inch, 1.0*inch, 1.0*inch, 1.0*inch, 1.7*inch],
                          repeatRows=1, splitByRow=True)
                t.setStyle(_table_style_header(BRAND_SECONDARY))
                t.setStyle(_table_style_body())
                t.setStyle(TableStyle([
                    ("ALIGN", (1,1), (1,-1), "LEFT"),
                    ("ALIGN", (5,1), (5,-1), "LEFT"),
                    ("FONTNAME", (5,1), (5,-1), _font_regular()),
                    ("FONTSIZE", (5,1), (5,-1), 8),
                ]))
                story.append(t)
                if i < (len(body) - 1) // 20:
                    story.append(PageBreak())
                else:
                    story.append(Spacer(1, 10))

        # Detalle de ventas
        story.append(Paragraph("DETALLE DE VENTAS", heading_style))
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
        if len(ven_rows) == 1:
            story.append(Paragraph("Sin ventas registradas.", note_style))
        else:
            header, body = ven_rows[0], ven_rows[1:]
            for i, chunk in enumerate(_chunk_rows(body, 20)):
                t = Table([header] + chunk,
                          colWidths=[0.9*inch, 1.4*inch, 0.7*inch, 1.0*inch, 1.1*inch, 0.9*inch, 1.1*inch],
                          repeatRows=1, splitByRow=True)
                t.setStyle(_table_style_header(BRAND_ACCENT, colors.white))
                t.setStyle(_table_style_body())
                t.setStyle(TableStyle([("ALIGN", (1,1), (1,-1), "LEFT")]))
                # utilidad negativa (col 6)
                neg_styles = _styles_for_negative_column(chunk, col_index=6, parse_pct=False)
                if neg_styles:
                    t.setStyle(TableStyle(neg_styles))
                story.append(t)
                if i < (len(body) - 1) // 20:
                    story.append(PageBreak())
                else:
                    story.append(Spacer(1, 10))

        # Análisis de categorías
        cats = reporte_data.get("analisis_categorias") or []
        if cats:
            story.append(Paragraph("ANÁLISIS DE CATEGORÍAS (Inversiones)", heading_style))
            data = [["Categoría", "Total", "%"]]
            for c in cats:
                data.append([_safe_str(c.get("categoria")), f"${_money(c.get('total')):,.2f}", f"{_pct(c.get('porcentaje')):.1f}%"])
            t = Table(data, colWidths=[3.0*inch, 1.6*inch, 0.9*inch], repeatRows=1)
            t.setStyle(_table_style_header(BRAND_SECONDARY))
            t.setStyle(_table_style_body())
            story.append(t)
            story.append(Spacer(1, 10))

        # Análisis de variedades
        vars_ = reporte_data.get("analisis_variedades") or []
        if vars_:
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
            t.setStyle(_table_style_header(BRAND_ACCENT, colors.white))
            t.setStyle(_table_style_body())
            story.append(t)

        header = partial(_pdf_header_footer, title="Reporte de Cosecha", subtitle=huerta_nombre)
        doc.build(story, onFirstPage=header, onLaterPages=header)
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def generar_pdf_temporada(reporte_data: Dict[str, Any]) -> bytes:
        weasy = _try_weasy_from_reporting("temporada", reporte_data)
        if weasy:
            return weasy

        buffer = BytesIO()
        doc = _pdf_doc(buffer)
        title_style, heading_style, subtitle_style, note_style, highlight_style = _pdf_styles()
        story: List[Any] = []

        # Portada
        story.append(Spacer(1, 2 * inch))
        story.append(Paragraph("REPORTE DE TEMPORADA", title_style))
        story.append(Spacer(1, 0.2 * inch))

        info = reporte_data.get("informacion_general", {}) or {}
        huerta_nombre = _safe_str(info.get("huerta_nombre"))
        temporada = _safe_str(info.get("temporada_año"))

        story.append(Paragraph(f"{huerta_nombre} | {temporada}", subtitle_style))
        story.append(Spacer(1, 0.5 * inch))

        fi = _first(info.get("fecha_inicio")); ff = _first(info.get("fecha_fin"))
        periodo_txt = _safe_str(info.get("periodo") or (f"{fi} - {ff}" if (fi or ff) else ""))

        story.append(Paragraph(f"Período: {periodo_txt}", ParagraphStyle(
            "Detail", parent=subtitle_style, fontSize=10, textColor=BRAND_GREY
        )))

        story.append(PageBreak())

        # Información general
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
        from reportlab.platypus import Table
        t_info = Table(info_data, colWidths=[2 * inch, 4 * inch])
        t_info.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), BRAND_LIGHT),
            ("TEXTCOLOR", (0, 0), (0, -1), BRAND_GREY),
            ("TEXTCOLOR", (1, 0), (1, -1), BRAND_SECONDARY),
            ("ALIGN", (0, 0), (0, -1), "LEFT"),
            ("ALIGN", (1, 0), (1, -1), "LEFT"),
            ("FONTNAME", (0, 0), (0, -1), _font_bold()),
            ("FONTNAME", (1, 0), (1, -1), _font_regular()),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dee2e6")),
        ]))
        story += [t_info, Spacer(1, 15)]

        # Resumen ejecutivo
        story.append(Paragraph("RESUMEN EJECUTIVO", heading_style))
        res = reporte_data.get("resumen_ejecutivo", {}) or {}

        flags = (reporte_data.get("flags") or {})
        if flags.get("tiene_perdida"):
            alert_style = ParagraphStyle(
                "Alert", parent=note_style, textColor=BRAND_DANGER, backColor=HexColor("#fff3cd")
            )
            story.append(Paragraph("ALERTA: La temporada presenta <b>ganancia neta negativa</b>.", alert_style))
            story.append(Spacer(1, 10))

        ganancia_neta = _money(res.get('ganancia_neta'))
        roi = _pct(res.get('roi_temporada'))

        _add_value_box(story, "Inversión Total", f"${_money(res.get('inversion_total')):,.2f}", BRAND_SECONDARY)
        _add_value_box(story, "Ventas Totales", f"${_money(res.get('ventas_totales')):,.2f}", BRAND_SUCCESS)
        _add_value_box(story, "Ganancia Neta", f"${ganancia_neta:,.2f}",
                       BRAND_DANGER if ganancia_neta < 0 else BRAND_SUCCESS)
        _add_value_box(story, "ROI Temporada", f"{roi:.1f}%",
                       BRAND_DANGER if roi < 0 else BRAND_SUCCESS)
        _add_value_box(story, "Productividad", f"{_money(res.get('productividad')):.1f} cajas/ha", BRAND_SECONDARY)

        story.append(Spacer(1, 15))

        # Comparativo por cosecha
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
            for i, chunk in enumerate(_chunk_rows(body, 20)):
                t = Table([header] + chunk,
                          colWidths=[1.6*inch, 1.2*inch, 1.2*inch, 1.2*inch, 0.9*inch, 0.8*inch],
                          repeatRows=1, splitByRow=True)
                t.setStyle(_table_style_header(BRAND_SECONDARY))
                t.setStyle(_table_style_body())
                t.setStyle(TableStyle([("ALIGN", (0,1), (0,-1), "LEFT")]))
                # ROI negativo (col 4)
                neg_styles = _styles_for_negative_column(chunk, col_index=4, parse_pct=True)
                if neg_styles:
                    t.setStyle(TableStyle(neg_styles))
                story.append(t)
                if i < (len(body) - 1) // 20:
                    story.append(PageBreak())
                else:
                    story.append(Spacer(1, 10))

        header_fn = partial(_pdf_header_footer, title="Reporte de Temporada", subtitle=huerta_nombre)
        doc.build(story, onFirstPage=header_fn, onLaterPages=header_fn)
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def generar_pdf_perfil_huerta(reporte_data: Dict[str, Any]) -> bytes:
        weasy = _try_weasy_from_reporting("perfil_huerta", reporte_data)
        if weasy:
            return weasy

        buffer = BytesIO()
        doc = _pdf_doc(buffer)
        title_style, heading_style, subtitle_style, note_style, highlight_style = _pdf_styles()
        story: List[Any] = []

        # Portada
        story.append(Spacer(1, 2 * inch))
        story.append(Paragraph("PERFIL DE HUERTA", title_style))
        story.append(Spacer(1, 0.2 * inch))

        info = reporte_data.get("informacion_general", {}) or {}
        huerta_nombre = _safe_str(info.get("huerta_nombre"))
        huerta_tipo = _safe_str(info.get("huerta_tipo"))

        story.append(Paragraph(f"{huerta_nombre} | {huerta_tipo}", subtitle_style))
        story.append(Spacer(1, 0.5 * inch))

        ubicacion = _safe_str(info.get("ubicacion"))
        story.append(Paragraph(f"Ubicación: {ubicacion}", ParagraphStyle(
            "Detail", parent=subtitle_style, fontSize=10, textColor=BRAND_GREY
        )))

        story.append(PageBreak())

        # Información general
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
        from reportlab.platypus import Table
        t_info = Table(info_data, colWidths=[2 * inch, 4 * inch])
        t_info.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), BRAND_LIGHT),
            ("TEXTCOLOR", (0, 0), (0, -1), BRAND_GREY),
            ("TEXTCOLOR", (1, 0), (1, -1), BRAND_SECONDARY),
            ("ALIGN", (0, 0), (0, -1), "LEFT"),
            ("ALIGN", (1, 0), (1, -1), "LEFT"),
            ("FONTNAME", (0, 0), (0, -1), _font_bold()),
            ("FONTNAME", (1, 0), (1, -1), _font_regular()),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#dee2e6")),
        ]))
        story += [t_info, Spacer(1, 15)]

        # Resumen histórico
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
            for i, chunk in enumerate(_chunk_rows(body, 15)):
                t = Table([header] + chunk,
                          colWidths=[0.8*inch, 1.2*inch, 1.2*inch, 1.2*inch, 0.8*inch, 1.2*inch, 0.8*inch],
                          repeatRows=1, splitByRow=True)
                t.setStyle(_table_style_header(BRAND_SECONDARY))
                t.setStyle(_table_style_body())
                # ROI negativo (col 4)
                neg_styles = _styles_for_negative_column(chunk, col_index=4, parse_pct=True)
                if neg_styles:
                    t.setStyle(TableStyle(neg_styles))
                story.append(t)
                if i < (len(body) - 1) // 15:
                    story.append(PageBreak())
                else:
                    story.append(Spacer(1, 15))

        # Análisis de eficiencia
        ef = reporte_data.get("analisis_eficiencia") or {}
        story += [Paragraph("ANÁLISIS DE EFICIENCIA", heading_style)]
        ef_data = [
            ["Métrica", "Valor"],
            ["Mejor Temporada", f"{_safe_str(ef.get('mejor_temporada', {}).get('año'))} (ROI: {_pct(ef.get('mejor_temporada', {}).get('roi')):.1f}%)"],
            ["Peor Temporada", f"{_safe_str(ef.get('peor_temporada', {}).get('año'))} (ROI: {_pct(ef.get('peor_temporada', {}).get('roi')):.1f}%)"],
            ["ROI Promedio Histórico", f"{_pct(ef.get('roi_promedio_historico')):.1f}%"],
            ["Variabilidad ROI", f"±{_pct(ef.get('variabilidad_roi')):.1f}%"],
            ["Tendencia", _safe_str(ef.get("tendencia"))],
        ]
        t_ef = Table(ef_data, colWidths=[2.5 * inch, 3.5 * inch], repeatRows=1)
        t_ef.setStyle(_table_style_header(BRAND_SECONDARY))
        t_ef.setStyle(_table_style_body())
        story.append(t_ef)
        story.append(Spacer(1, 15))

        # Proyecciones
        pr = reporte_data.get("proyecciones") or {}
        story += [Paragraph("PROYECCIONES", heading_style)]
        pr_data = [
            ["Proyección de Ventas Próx. Temporada", f"${_money(pr.get('proyeccion_proxima_temporada')):,.2f}"],
            ["ROI Esperado", f"{_pct(pr.get('roi_esperado')):.1f}%"],
            ["Recomendaciones", ", ".join([_safe_str(x) for x in (pr.get("recomendaciones") or [])]) or "-"],
            ["Alertas", ", ".join([_safe_str(x) for x in (pr.get("alertas") or [])]) or "-"],
        ]
        t_pr = Table(pr_data, colWidths=[2.5 * inch, 3.5 * inch], repeatRows=1)
        t_pr.setStyle(_table_style_header(BRAND_ACCENT, colors.white))
        t_pr.setStyle(_table_style_body())
        story.append(t_pr)

        header_fn = partial(_pdf_header_footer, title="Perfil de Huerta", subtitle=huerta_nombre)
        doc.build(story, onFirstPage=header_fn, onLaterPages=header_fn)
        buffer.seek(0)
        return buffer.getvalue()
