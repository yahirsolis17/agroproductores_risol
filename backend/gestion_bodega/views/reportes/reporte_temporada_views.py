"""Reporte de temporada de bodega - placeholder (JSON/PDF/Excel)."""

# backend/gestion_bodega/views/reportes/reporte_temporada_views.py
from rest_framework import views, permissions, status
from rest_framework.response import Response

from ...utils.notification_handler import NotificationHandler

try:
    from gestion_usuarios.permissions import HasModulePermission
    _BasePerms = [permissions.IsAuthenticated, HasModulePermission]
except Exception:
    _BasePerms = [permissions.IsAuthenticated]

# Services de negocio (debes implementarlos en services/reportes/temporada_service.py)
from ...services.reportes.temporada_service import (
    build_reporte_temporada_json,
    build_reporte_temporada_pdf,
    build_reporte_temporada_excel,
)


class ReporteTemporadaView(views.APIView):
    """
    Expone generación de reportes de temporada en JSON/PDF/Excel.
    Body:
      {
        "bodega": 1,
        "temporada": 3,
        "formato": "json|pdf|excel"
      }
    """
    permission_classes = _BasePerms

    def post(self, request, *args, **kwargs):
        bodega = request.data.get("bodega")
        temporada = request.data.get("temporada")
        formato = (request.data.get("formato") or "json").lower()

        try:
            if formato == "json":
                data = build_reporte_temporada_json(bodega, temporada)
                return Response(data)
            elif formato == "pdf":
                pdf_bytes, filename = build_reporte_temporada_pdf(bodega, temporada)
                resp = Response(pdf_bytes, content_type="application/pdf", status=status.HTTP_200_OK)
                resp["Content-Disposition"] = f'attachment; filename="{filename}"'
                return resp
            elif formato == "excel":
                xlsx_bytes, filename = build_reporte_temporada_excel(bodega, temporada)
                resp = Response(xlsx_bytes, content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", status=status.HTTP_200_OK)
                resp["Content-Disposition"] = f'attachment; filename="{filename}"'
                return resp
            else:
                return NotificationHandler.generate_response(
                    "validation_error", status_code=status.HTTP_400_BAD_REQUEST,
                    data={"detail": "formato debe ser json|pdf|excel"}
                )
        except Exception as e:
            return NotificationHandler.generate_response(
                "server_error", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                data={"detail": str(e)}
            )
