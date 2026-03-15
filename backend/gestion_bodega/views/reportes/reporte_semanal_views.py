"""Reporte semanal de bodega (JSON/PDF/Excel)."""

from django.http import HttpResponse
from rest_framework import permissions, status, views

from gestion_usuarios.permissions import HasModulePermission
from ...services.reportes.semanal_service import (
    build_reporte_semanal_excel,
    build_reporte_semanal_json,
    build_reporte_semanal_pdf,
)
from ...utils.activity import registrar_actividad
from ...utils.notification_handler import NotificationHandler


class ReporteSemanalView(views.APIView):
    """
    Body:
      {
        "bodega": 1,
        "temporada": 3,
        "iso_semana": "2025-W36",
        "formato": "json|pdf|excel|xlsx"
      }
    """

    permission_classes = [permissions.IsAuthenticated, HasModulePermission]
    required_permissions = ["view_dashboard"]

    def get_permissions(self):
        formato = (getattr(self.request, "data", {}) or {}).get("formato", "json")
        formato = str(formato).lower()
        if formato == "pdf":
            self.required_permissions = ["view_dashboard", "exportpdf_cierresemanal"]
        elif formato in {"excel", "xlsx"}:
            self.required_permissions = ["view_dashboard", "exportexcel_cierresemanal"]
        else:
            self.required_permissions = ["view_dashboard"]
        return [permission() for permission in self.permission_classes]

    def post(self, request, *args, **kwargs):
        bodega = request.data.get("bodega")
        temporada = request.data.get("temporada")
        iso_semana = request.data.get("iso_semana")
        formato = (request.data.get("formato") or "json").lower()

        try:
            if formato == "json":
                data = build_reporte_semanal_json(bodega, temporada, iso_semana)
                registrar_actividad(
                    request.user,
                    "Consulto reporte semanal de bodega",
                    detalles=f"bodega={bodega}; temporada={temporada}; iso_semana={iso_semana}; formato=json",
                    ip=request.META.get("REMOTE_ADDR"),
                )
                return NotificationHandler.generate_response(
                    message_key="reporte_semanal_consultado",
                    data={"reporte": data},
                )

            if formato == "pdf":
                pdf_bytes, filename = build_reporte_semanal_pdf(bodega, temporada, iso_semana)
                registrar_actividad(
                    request.user,
                    "Exporto reporte semanal de bodega",
                    detalles=f"bodega={bodega}; temporada={temporada}; iso_semana={iso_semana}; formato=pdf",
                    ip=request.META.get("REMOTE_ADDR"),
                )
                resp = HttpResponse(pdf_bytes, content_type="application/pdf", status=status.HTTP_200_OK)
                resp["Content-Disposition"] = f'attachment; filename="{filename}"'
                resp["X-Content-Type-Options"] = "nosniff"
                return resp

            if formato in {"excel", "xlsx"}:
                xlsx_bytes, filename = build_reporte_semanal_excel(bodega, temporada, iso_semana)
                registrar_actividad(
                    request.user,
                    "Exporto reporte semanal de bodega",
                    detalles=f"bodega={bodega}; temporada={temporada}; iso_semana={iso_semana}; formato=excel",
                    ip=request.META.get("REMOTE_ADDR"),
                )
                resp = HttpResponse(
                    xlsx_bytes,
                    content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    status=status.HTTP_200_OK,
                )
                resp["Content-Disposition"] = f'attachment; filename="{filename}"'
                resp["X-Content-Type-Options"] = "nosniff"
                return resp

            return NotificationHandler.generate_response(
                "reporte_formato_invalido",
                status_code=status.HTTP_400_BAD_REQUEST,
                data={"detail": "formato debe ser json|pdf|excel|xlsx"},
            )
        except ValueError as exc:
            return NotificationHandler.generate_response(
                "reporte_parametros_invalidos",
                status_code=status.HTTP_400_BAD_REQUEST,
                data={"detail": str(exc)},
            )
        except Exception as exc:
            return NotificationHandler.generate_response(
                "reporte_generacion_error",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                data={"detail": str(exc)},
            )
