# -*- coding: utf-8 -*-
from __future__ import annotations
from typing import Optional

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.core.exceptions import ValidationError, PermissionDenied

# NUEVO: usamos el servicio específico de perfil de huerta
from gestion_huerta.services.reportes.perfil_huerta_service import generar_perfil_huerta
from gestion_huerta.services.exportacion_service import ExportacionService
from gestion_huerta.utils.notification_handler import NotificationHandler
from gestion_huerta.permissions import HasHuertaModulePermission


def _as_int(value: Optional[object], field: str) -> int:
    try:
        return int(value)
    except Exception:
        raise ValidationError({field: f"{field} debe ser entero válido"})


def _truthy(v: object) -> bool:
    if isinstance(v, bool):
        return v
    s = str(v).strip().lower()
    return s in {"1", "true", "t", "yes", "y", "si", "sí"}


class PerfilHuertaReportViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, HasHuertaModulePermission]

    @action(detail=False, methods=["post"], url_path="perfil-huerta")
    def perfil_huerta(self, request):
        huerta_id = request.data.get("huerta_id")
        huerta_rentada_id = request.data.get("huerta_rentada_id")
        años_raw = request.data.get("años", 5)
        formato = (request.data.get("formato") or "json").strip().lower()
        force_refresh = _truthy(request.data.get("force_refresh", False))

        if not huerta_id and not huerta_rentada_id:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": {"huerta": "ID de huerta o huerta_rentada requerido"}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if huerta_id and huerta_rentada_id:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": {"huerta": "Proporcione solo una: huerta_id o huerta_rentada_id"}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        try:
            años = int(años_raw)
            if años < 1 or años > 10:
                raise ValueError()
        except Exception:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": {"años": "Años debe ser entero entre 1 y 10"}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if formato not in {"json", "pdf", "excel", "xlsx"}:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": {"formato": "Formato debe ser json, pdf o excel/xlsx"}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            hid = _as_int(huerta_id, "huerta_id") if huerta_id is not None else None
            hrid = _as_int(huerta_rentada_id, "huerta_rentada_id") if huerta_rentada_id is not None else None

            # Generamos SIEMPRE el JSON (con nuevos campos) y exportamos si aplica
            reporte_data = generar_perfil_huerta(
                huerta_id=hid,
                huerta_rentada_id=hrid,
                usuario=request.user,
                años=años,
                formato="json",
                force_refresh=force_refresh,
            )

            if formato == "pdf":
                pdf = ExportacionService.generar_pdf_perfil_huerta(reporte_data)
                base = f"huerta_{hid}" if hid else f"huerta_rentada_{hrid}"
                resp = HttpResponse(pdf, content_type="application/pdf")
                resp["Content-Disposition"] = f'attachment; filename="perfil_{base}.pdf"'
                return resp

            if formato in {"excel", "xlsx"}:
                excel = ExportacionService.generar_excel_perfil_huerta(reporte_data)
                base = f"huerta_{hid}" if hid else f"huerta_rentada_{hrid}"
                resp = HttpResponse(
                    excel, content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
                resp["Content-Disposition"] = f'attachment; filename="perfil_{base}.xlsx"'
                return resp

            return NotificationHandler.generate_response(
                message_key="reporte_generado_exitosamente",
                data={"reporte": reporte_data},
                status_code=status.HTTP_200_OK,
            )
        except PermissionDenied:
            return NotificationHandler.generate_response(
                message_key="permission_denied", status_code=status.HTTP_403_FORBIDDEN
            )
        except ValidationError as e:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": getattr(e, "message_dict", {"detalle": str(e)})},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return NotificationHandler.generate_response(
                message_key="server_error", data={"error": str(e)}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
