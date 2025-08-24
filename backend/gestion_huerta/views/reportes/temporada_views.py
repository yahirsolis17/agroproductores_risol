# -*- coding: utf-8 -*-
from __future__ import annotations
from typing import Optional

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.core.exceptions import ValidationError, PermissionDenied

from gestion_huerta.services.reportes_produccion_service import ReportesProduccionService
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


class TemporadaReportViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, HasHuertaModulePermission]

    @action(detail=False, methods=["post"], url_path="temporada")
    def reporte_temporada(self, request):
        temporada_id_raw = request.data.get("temporada_id")
        formato = (request.data.get("formato") or "json").strip().lower()
        force_refresh = _truthy(request.data.get("force_refresh", False))

        if temporada_id_raw is None:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": {"temporada_id": "ID de temporada requerido"}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if formato not in {"json", "pdf", "excel"}:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": {"formato": "Formato debe ser json, pdf o excel"}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        try:
            temporada_id = _as_int(temporada_id_raw, "temporada_id")
            reporte_data = ReportesProduccionService.generar_reporte_temporada(
                temporada_id=temporada_id, usuario=request.user, formato="json", force_refresh=force_refresh
            )

            if formato == "pdf":
                pdf = ExportacionService.generar_pdf_temporada(reporte_data)
                info = (reporte_data or {}).get("informacion_general", {}) or {}
                base = f"{info.get('temporada_año','')}_{info.get('huerta_nombre','')}".strip("_") or f"{temporada_id}"
                resp = HttpResponse(pdf, content_type="application/pdf")
                resp["Content-Disposition"] = f'attachment; filename="reporte_temporada_{base}.pdf"'
                return resp

            if formato == "excel":
                excel = ExportacionService.generar_excel_temporada(reporte_data)
                info = (reporte_data or {}).get("informacion_general", {}) or {}
                base = f"{info.get('temporada_año','')}_{info.get('huerta_nombre','')}".strip("_") or f"{temporada_id}"
                resp = HttpResponse(
                    excel, content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
                resp["Content-Disposition"] = f'attachment; filename="reporte_temporada_{base}.xlsx"'
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
