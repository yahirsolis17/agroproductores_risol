# backend/gestion_huerta/views/informes_views.py

from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from gestion_huerta.utils import reporting
from gestion_huerta.utils.notification_handler import NotificationHandler

class ReportesViewSet(viewsets.GenericViewSet):
    """ViewSet de informes de producción."""
    permission_classes = [permissions.IsAuthenticated]  # y posiblemente IsAdminUser o permisos custom
    
    @action(detail=True, methods=["get"], url_path="cosechas")
    def cosechas(self, request, pk=None):
        """Endpoint: /informes/cosechas/<id>/ - Reporte de Cosecha."""
        data = {}
        try:
            # Verificar permiso de acceso a la cosecha 'pk' aquí, e.g. que el request.user sea propietario o admin.
            result = reporting.aggregates_for_cosecha(int(pk))
            series = reporting.series_for_cosecha(int(pk))
            # Armar respuesta consolidando kpis, series y tablas
            data["kpis"] = result["kpis"]
            data["series"] = series
            # Combinar tablas de detalle en un solo objeto si es requerido por frontend
            data["tabla"] = {
                "inversiones": result["tabla_inversiones"],
                "ventas": result["tabla_ventas"]
            }
            # Respuesta de éxito con NotificationHandler
            return NotificationHandler.generate_response(
                message_key="REPORT_SUCCESS", data=data
            )
        except Exception as e:
            return NotificationHandler.generate_response(
                message_key="REPORT_ERROR", 
                data={"detail": str(e)}, 
                status_code=500
            )
    
    @action(detail=True, methods=["get"], url_path="temporadas")
    def temporadas(self, request, pk=None):
        """Endpoint: /informes/temporadas/<id>/ - Reporte de Temporada."""
        # Similar estructura que cosechas
        try:
            result = reporting.aggregates_for_temporada(int(pk))
            series = reporting.series_for_temporada(int(pk))
            data = {
                "kpis": result["kpis"],
                "series": series,
                "tabla": result["tabla"]
            }
            return NotificationHandler.generate_response("REPORT_SUCCESS", data=data)
        except Exception as e:
            return NotificationHandler.generate_response("REPORT_ERROR", {"detail": str(e)}, status_code=500)
    
    @action(detail=True, methods=["get"], url_path="huertas/perfil")
    def huertas_perfil(self, request, pk=None):
        """Endpoint: /informes/huertas/<id>/perfil/ - Perfil Histórico de Huerta."""
        try:
            result = reporting.aggregates_for_huerta(int(pk))
            series = reporting.series_for_huerta(int(pk))
            data = {
                "kpis": result["kpis"],
                "series": series,
                "tabla": result["tabla"]
            }
            return NotificationHandler.generate_response("REPORT_SUCCESS", data=data)
        except Exception as e:
            return NotificationHandler.generate_response("REPORT_ERROR", {"detail": str(e)}, status=500)
