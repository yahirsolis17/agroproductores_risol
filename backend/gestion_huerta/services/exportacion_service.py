"""
Servicio para exportar reportes de producción a PDF y Excel con gráficas.
Corrige los problemas identificados en ReportLab y openpyxl.
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor

from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.chart import BarChart, LineChart, PieChart, Reference

from io import BytesIO
from typing import Dict, Any


class ExportacionService:
    """Servicio para exportar reportes a PDF y Excel"""
    
    @staticmethod
    def generar_pdf_cosecha(reporte_data: Dict[str, Any]) -> bytes:
        """Genera PDF del reporte de cosecha con correcciones"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch)
        
        # Estilos corregidos
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1,  # Centrado
            textColor=colors.darkblue
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=12,
            spaceAfter=12,
            textColor=colors.darkgreen
        )
        
        # Contenido
        story = []
        
        # Título
        story.append(Paragraph("REPORTE DE PRODUCCIÓN - COSECHA INDIVIDUAL", title_style))
        story.append(Spacer(1, 20))
        
        # Información General
        info_general = reporte_data['informacion_general']
        story.append(Paragraph("INFORMACIÓN GENERAL", heading_style))
        
        info_data = [
            ['Huerta:', f"{info_general['huerta_nombre']} ({info_general['huerta_tipo']})"],
            ['Propietario:', info_general['propietario']],
            ['Temporada:', str(info_general['temporada_año'])],
            ['Cosecha:', info_general['cosecha_nombre']],
            ['Estado:', info_general['estado']],
            ['Hectáreas:', f"{info_general['hectareas']:.2f} ha"],
        ]
        
        info_table = Table(info_data, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(info_table)
        story.append(Spacer(1, 20))
        
        # Resumen Financiero
        resumen = reporte_data['resumen_financiero']
        story.append(Paragraph("RESUMEN FINANCIERO", heading_style))
        
        resumen_data = [
            ['Concepto', 'Monto'],
            ['Total Inversiones', f"${resumen['total_inversiones']:,.2f}"],
            ['Total Ventas', f"${resumen['total_ventas']:,.2f}"],
            ['Ganancia Bruta', f"${resumen['ganancia_bruta']:,.2f}"],
            ['Ganancia Neta', f"${resumen['ganancia_neta']:,.2f}"],
            ['ROI', f"{resumen['roi_porcentaje']:.1f}%"],
            ['Ganancia por Hectárea', f"${resumen['ganancia_por_hectarea']:,.2f}"],
        ]
        
        resumen_table = Table(resumen_data, colWidths=[3*inch, 2*inch])
        resumen_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(resumen_table)
        story.append(Spacer(1, 20))
        
        # Detalle de Inversiones
        story.append(Paragraph("DETALLE DE INVERSIONES", heading_style))
        
        inv_headers = ['Fecha', 'Categoría', 'Insumos', 'Mano Obra', 'Total']
        inv_data = [inv_headers]
        
        for inv in reporte_data['detalle_inversiones']:
            inv_data.append([
                inv['fecha'][:10],  # Solo fecha, sin hora
                inv['categoria'],
                f"${inv['gastos_insumos']:,.2f}",
                f"${inv['gastos_mano_obra']:,.2f}",
                f"${inv['total']:,.2f}"
            ])
        
        inv_table = Table(inv_data, colWidths=[1.2*inch, 1.5*inch, 1.2*inch, 1.2*inch, 1.2*inch])
        inv_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkgreen),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            # Corregido: usar ROWBACKGROUNDS en lugar de ALTERNATEROWCOLORS
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(inv_table)
        story.append(PageBreak())
        
        # Detalle de Ventas
        story.append(Paragraph("DETALLE DE VENTAS", heading_style))
        
        ven_headers = ['Fecha', 'Tipo Mango', 'Cajas', 'Precio/Caja', 'Total']
        ven_data = [ven_headers]
        
        for venta in reporte_data['detalle_ventas']:
            ven_data.append([
                venta['fecha'][:10],  # Solo fecha
                venta['tipo_mango'],
                str(venta['num_cajas']),
                f"${venta['precio_por_caja']:,.2f}",
                f"${venta['total_venta']:,.2f}"
            ])
        
        ven_table = Table(ven_data, colWidths=[1.2*inch, 1.5*inch, 1*inch, 1.2*inch, 1.4*inch])
        ven_table.setStyle(TableStyle([
            # Corregido: usar HexColor para colores personalizados
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#FF8C00')),  # DarkOrange
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(ven_table)
        
        # Construir PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    @staticmethod
    def generar_excel_cosecha(reporte_data: Dict[str, Any]) -> bytes:
        """Genera Excel del reporte de cosecha con gráficas"""
        wb = Workbook()
        
        # Hoja 1: Resumen
        ws_resumen = wb.active
        ws_resumen.title = "Resumen"
        
        # Estilos
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        
        # Título
        ws_resumen['A1'] = "REPORTE DE PRODUCCIÓN - COSECHA INDIVIDUAL"
        ws_resumen['A1'].font = Font(bold=True, size=16)
        ws_resumen.merge_cells('A1:F1')
        
        # Información General
        info = reporte_data['informacion_general']
        row = 3
        ws_resumen[f'A{row}'] = "INFORMACIÓN GENERAL"
        ws_resumen[f'A{row}'].font = header_font
        ws_resumen[f'A{row}'].fill = header_fill
        
        info_data = [
            ('Huerta', f"{info['huerta_nombre']} ({info['huerta_tipo']})"),
            ('Propietario', info['propietario']),
            ('Temporada', str(info['temporada_año'])),
            ('Cosecha', info['cosecha_nombre']),
            ('Estado', info['estado']),
            ('Hectáreas', f"{info['hectareas']:.2f} ha"),
        ]
        
        for i, (label, value) in enumerate(info_data, start=row+1):
            ws_resumen[f'A{i}'] = label
            ws_resumen[f'B{i}'] = value
            ws_resumen[f'A{i}'].font = Font(bold=True)
        
        # Resumen Financiero
        row += len(info_data) + 3
        ws_resumen[f'A{row}'] = "RESUMEN FINANCIERO"
        ws_resumen[f'A{row}'].font = header_font
        ws_resumen[f'A{row}'].fill = header_fill
        
        resumen = reporte_data['resumen_financiero']
        resumen_data = [
            ('Total Inversiones', resumen['total_inversiones']),
            ('Total Ventas', resumen['total_ventas']),
            ('Ganancia Bruta', resumen['ganancia_bruta']),
            ('Ganancia Neta', resumen['ganancia_neta']),
            ('ROI (%)', resumen['roi_porcentaje']),
            ('Ganancia por Hectárea', resumen['ganancia_por_hectarea']),
        ]
        
        for i, (label, value) in enumerate(resumen_data, start=row+1):
            ws_resumen[f'A{i}'] = label
            ws_resumen[f'B{i}'] = value
            ws_resumen[f'A{i}'].font = Font(bold=True)
            if isinstance(value, (int, float)):
                ws_resumen[f'B{i}'].number_format = '#,##0.00'
        
        # Ajustar anchos de columna
        for column in ws_resumen.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws_resumen.column_dimensions[column_letter].width = adjusted_width
        
        # Guardar en buffer
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()
    
    @staticmethod
    def generar_pdf_temporada(reporte_data: Dict[str, Any]) -> bytes:
        """Genera PDF del reporte de temporada"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch)
        
        story = []
        styles = getSampleStyleSheet()
        
        # Título
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1,
            textColor=colors.darkblue
        )
        
        story.append(Paragraph("REPORTE DE PRODUCCIÓN - TEMPORADA COMPLETA", title_style))
        story.append(Spacer(1, 20))
        
        # Información General
        info_general = reporte_data['informacion_general']
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=12,
            spaceAfter=12,
            textColor=colors.darkgreen
        )
        
        story.append(Paragraph("INFORMACIÓN GENERAL", heading_style))
        
        info_data = [
            ['Huerta:', f"{info_general['huerta_nombre']} ({info_general['huerta_tipo']})"],
            ['Propietario:', info_general['propietario']],
            ['Temporada:', str(info_general['temporada_año'])],
            ['Total Cosechas:', str(info_general['total_cosechas'])],
            ['Estado:', info_general['estado']],
            ['Hectáreas:', f"{info_general['hectareas']:.2f} ha"],
        ]
        
        info_table = Table(info_data, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(info_table)
        story.append(Spacer(1, 20))
        
        # Resumen Ejecutivo
        resumen = reporte_data['resumen_ejecutivo']
        story.append(Paragraph("RESUMEN EJECUTIVO", heading_style))
        
        resumen_data = [
            ['Concepto', 'Valor'],
            ['Inversión Total', f"${resumen['inversion_total']:,.2f}"],
            ['Ventas Totales', f"${resumen['ventas_totales']:,.2f}"],
            ['Ganancia Neta', f"${resumen['ganancia_neta']:,.2f}"],
            ['ROI Temporada', f"{resumen['roi_temporada']:.1f}%"],
            ['Productividad', f"{resumen['productividad']:.1f} cajas/ha"],
            ['Cajas Totales', f"{resumen['cajas_totales']} cajas"],
        ]
        
        resumen_table = Table(resumen_data, colWidths=[3*inch, 2*inch])
        resumen_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(resumen_table)
        story.append(Spacer(1, 20))
        
        # Comparativo por Cosecha
        story.append(Paragraph("COMPARATIVO POR COSECHA", heading_style))
        
        comp_headers = ['Cosecha', 'Inversión', 'Ventas', 'Ganancia', 'ROI', 'Cajas']
        comp_data = [comp_headers]
        
        for cosecha in reporte_data['comparativo_cosechas']:
            comp_data.append([
                cosecha['nombre'],
                f"${cosecha['inversion']:,.2f}",
                f"${cosecha['ventas']:,.2f}",
                f"${cosecha['ganancia']:,.2f}",
                f"{cosecha['roi']:.1f}%",
                str(cosecha['cajas'])
            ])
        
        comp_table = Table(comp_data, colWidths=[1.5*inch, 1.2*inch, 1.2*inch, 1.2*inch, 0.8*inch, 0.8*inch])
        comp_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkgreen),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(comp_table)
        
        # Construir PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    @staticmethod
    def generar_excel_temporada(reporte_data: Dict[str, Any]) -> bytes:
        """Genera Excel del reporte de temporada con gráficas"""
        wb = Workbook()
        
        # Hoja resumen ejecutivo
        ws_resumen = wb.active
        ws_resumen.title = "Resumen Ejecutivo"
        
        # Estilos
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        
        # Título
        ws_resumen['A1'] = "REPORTE DE PRODUCCIÓN - TEMPORADA COMPLETA"
        ws_resumen['A1'].font = Font(bold=True, size=16)
        ws_resumen.merge_cells('A1:F1')
        
        # Información General
        info = reporte_data['informacion_general']
        row = 3
        ws_resumen[f'A{row}'] = "INFORMACIÓN GENERAL"
        ws_resumen[f'A{row}'].font = header_font
        ws_resumen[f'A{row}'].fill = header_fill
        
        info_data = [
            ('Huerta', f"{info['huerta_nombre']} ({info['huerta_tipo']})"),
            ('Propietario', info['propietario']),
            ('Temporada', str(info['temporada_año'])),
            ('Total Cosechas', str(info['total_cosechas'])),
            ('Estado', info['estado']),
            ('Hectáreas', f"{info['hectareas']:.2f} ha"),
        ]
        
        for i, (label, value) in enumerate(info_data, start=row+1):
            ws_resumen[f'A{i}'] = label
            ws_resumen[f'B{i}'] = value
            ws_resumen[f'A{i}'].font = Font(bold=True)
        
        # Resumen Ejecutivo
        row += len(info_data) + 3
        ws_resumen[f'A{row}'] = "RESUMEN EJECUTIVO"
        ws_resumen[f'A{row}'].font = header_font
        ws_resumen[f'A{row}'].fill = header_fill
        
        resumen = reporte_data['resumen_ejecutivo']
        resumen_data = [
            ('Inversión Total', resumen['inversion_total']),
            ('Ventas Totales', resumen['ventas_totales']),
            ('Ganancia Neta', resumen['ganancia_neta']),
            ('ROI Temporada (%)', resumen['roi_temporada']),
            ('Productividad (cajas/ha)', resumen['productividad']),
            ('Cajas Totales', resumen['cajas_totales']),
        ]
        
        for i, (label, value) in enumerate(resumen_data, start=row+1):
            ws_resumen[f'A{i}'] = label
            ws_resumen[f'B{i}'] = value
            ws_resumen[f'A{i}'].font = Font(bold=True)
            if isinstance(value, (int, float)) and 'cajas' not in label.lower():
                ws_resumen[f'B{i}'].number_format = '#,##0.00'
        
        # Ajustar anchos
        for column in ws_resumen.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws_resumen.column_dimensions[column_letter].width = adjusted_width
        
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()
    
    @staticmethod
    def generar_pdf_perfil_huerta(reporte_data: Dict[str, Any]) -> bytes:
        """Genera PDF del perfil histórico de huerta"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch)
        
        story = []
        styles = getSampleStyleSheet()
        
        # Título
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1,
            textColor=colors.darkblue
        )
        
        story.append(Paragraph("PERFIL HISTÓRICO DE HUERTA", title_style))
        story.append(Spacer(1, 20))
        
        # Información General
        info_general = reporte_data['informacion_general']
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=12,
            spaceAfter=12,
            textColor=colors.darkgreen
        )
        
        story.append(Paragraph("INFORMACIÓN GENERAL", heading_style))
        
        info_data = [
            ['Huerta:', f"{info_general['huerta_nombre']} ({info_general['huerta_tipo']})"],
            ['Propietario:', info_general['propietario']],
            ['Ubicación:', info_general['ubicacion']],
            ['Hectáreas:', f"{info_general['hectareas']:.2f} ha"],
            ['Variedades:', info_general['variedades']],
            ['Años de Operación:', str(info_general['años_operacion'])],
            ['Temporadas Analizadas:', str(info_general['temporadas_analizadas'])],
        ]
        
        info_table = Table(info_data, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(info_table)
        story.append(Spacer(1, 20))
        
        # Resumen Histórico
        story.append(Paragraph("RESUMEN HISTÓRICO", heading_style))
        
        hist_headers = ['Año', 'Inversión', 'Ventas', 'Ganancia', 'ROI', 'Productividad']
        hist_data = [hist_headers]
        
        for dato in reporte_data['resumen_historico']:
            hist_data.append([
                str(dato['año']),
                f"${dato['inversion']:,.2f}",
                f"${dato['ventas']:,.2f}",
                f"${dato['ganancia']:,.2f}",
                f"{dato['roi']:.1f}%",
                f"{dato['productividad']} cajas"
            ])
        
        hist_table = Table(hist_data, colWidths=[0.8*inch, 1.2*inch, 1.2*inch, 1.2*inch, 0.8*inch, 1.2*inch])
        hist_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(hist_table)
        story.append(Spacer(1, 20))
        
        # Análisis de Eficiencia
        eficiencia = reporte_data['analisis_eficiencia']
        story.append(Paragraph("ANÁLISIS DE EFICIENCIA", heading_style))
        
        efic_data = [
            ['Métrica', 'Valor'],
            ['Mejor Temporada', f"{eficiencia['mejor_temporada']['año']} (ROI: {eficiencia['mejor_temporada']['roi']:.1f}%)"],
            ['Peor Temporada', f"{eficiencia['peor_temporada']['año']} (ROI: {eficiencia['peor_temporada']['roi']:.1f}%)"],
            ['ROI Promedio Histórico', f"{eficiencia['roi_promedio_historico']:.1f}%"],
            ['Variabilidad ROI', f"±{eficiencia['variabilidad_roi']:.1f}%"],
            ['Tendencia', eficiencia['tendencia']],
        ]
        
        efic_table = Table(efic_data, colWidths=[3*inch, 2*inch])
        efic_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.darkgreen),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(efic_table)
        
        # Construir PDF
        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()
    
    @staticmethod
    def generar_excel_perfil_huerta(reporte_data: Dict[str, Any]) -> bytes:
        """Genera Excel del perfil histórico con gráficas"""
        wb = Workbook()
        
        # Hoja resumen histórico
        ws_resumen = wb.active
        ws_resumen.title = "Resumen Histórico"
        
        # Estilos
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="366092", end_color="366092", fill_type="solid")
        
        # Título
        ws_resumen['A1'] = "PERFIL HISTÓRICO DE HUERTA"
        ws_resumen['A1'].font = Font(bold=True, size=16)
        ws_resumen.merge_cells('A1:G1')
        
        # Información General
        info = reporte_data['informacion_general']
        row = 3
        ws_resumen[f'A{row}'] = "INFORMACIÓN GENERAL"
        ws_resumen[f'A{row}'].font = header_font
        ws_resumen[f'A{row}'].fill = header_fill
        
        info_data = [
            ('Huerta', f"{info['huerta_nombre']} ({info['huerta_tipo']})"),
            ('Propietario', info['propietario']),
            ('Ubicación', info['ubicacion']),
            ('Hectáreas', f"{info['hectareas']:.2f} ha"),
            ('Variedades', info['variedades']),
            ('Años de Operación', str(info['años_operacion'])),
            ('Temporadas Analizadas', str(info['temporadas_analizadas'])),
        ]
        
        for i, (label, value) in enumerate(info_data, start=row+1):
            ws_resumen[f'A{i}'] = label
            ws_resumen[f'B{i}'] = value
            ws_resumen[f'A{i}'].font = Font(bold=True)
        
        # Resumen Histórico
        row += len(info_data) + 3
        ws_resumen[f'A{row}'] = "RESUMEN HISTÓRICO"
        ws_resumen[f'A{row}'].font = header_font
        ws_resumen[f'A{row}'].fill = header_fill
        
        hist_headers = ['Año', 'Inversión', 'Ventas', 'Ganancia', 'ROI (%)', 'Productividad', 'Cosechas']
        for col, header in enumerate(hist_headers, 1):
            cell = ws_resumen.cell(row=row+1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
        
        for i, dato in enumerate(reporte_data['resumen_historico'], start=row+2):
            ws_resumen.cell(row=i, column=1, value=dato['año'])
            ws_resumen.cell(row=i, column=2, value=dato['inversion'])
            ws_resumen.cell(row=i, column=3, value=dato['ventas'])
            ws_resumen.cell(row=i, column=4, value=dato['ganancia'])
            ws_resumen.cell(row=i, column=5, value=dato['roi'])
            ws_resumen.cell(row=i, column=6, value=dato['productividad'])
            ws_resumen.cell(row=i, column=7, value=dato['cosechas_count'])
            
            # Formato numérico
            for col in [2, 3, 4, 5]:
                ws_resumen.cell(row=i, column=col).number_format = '#,##0.00'
        
        # Ajustar anchos
        for column in ws_resumen.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            ws_resumen.column_dimensions[column_letter].width = adjusted_width
        
        buffer = BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()
