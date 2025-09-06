# -*- coding: utf-8 -*-
from __future__ import annotations
from typing import Optional

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.core.exceptions import ValidationError, PermissionDenied
from django.utils.text import slugify
from django.utils import timezone

from gestion_huerta.services.reportes.cosecha_service import generar_reporte_cosecha
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


def _safe_filename(prefix: str, base: str, ext: str) -> str:
    """
    Sanea y limita el nombre del archivo para descargas.
    """
    name = slugify(str(base))[:80] or "reporte"
    return f"{prefix}_{name}.{ext}"


class CosechaReportViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, HasHuertaModulePermission]

    @action(detail=False, methods=["post"], url_path="cosecha")
    def reporte_cosecha(self, request):
        cosecha_id_raw = request.data.get("cosecha_id")
        formato = (request.data.get("formato") or "json").strip().lower()
        force_refresh = _truthy(request.data.get("force_refresh", False))

        if cosecha_id_raw is None:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": {"cosecha_id": "ID de cosecha requerido"}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if formato not in {"json", "pdf", "excel", "xlsx"}:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": {"formato": "Formato debe ser json, pdf o excel/xlsx"}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            cosecha_id = _as_int(cosecha_id_raw, "cosecha_id")

            # Generar SIEMPRE JSON y exportar si aplica
            reporte_data = generar_reporte_cosecha(
                cosecha_id=cosecha_id,
                usuario=request.user,
                formato="json",
                force_refresh=force_refresh,
            )

            info = (reporte_data or {}).get("informacion_general", {}) or {}
            base = f"{info.get('temporada_año','')}_{info.get('cosecha_nombre','')}".strip("_") or f"{cosecha_id}"
            fecha = timezone.localtime(timezone.now()).strftime("%Y-%m-%d")

            if formato == "pdf":
                pdf = ExportacionService.generar_pdf_cosecha(reporte_data)
                resp = HttpResponse(pdf, content_type="application/pdf")
                resp["Content-Disposition"] = (
                    f'attachment; filename="{_safe_filename("reporte_cosecha", f"{base}_{fecha}", "pdf")}"'
                )
                resp["X-Content-Type-Options"] = "nosniff"
                return resp

            if formato in {"excel", "xlsx"}:
                excel = ExportacionService.generar_excel_cosecha(reporte_data)
                resp = HttpResponse(
                    excel,
                    content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
                resp["Content-Disposition"] = (
                    f'attachment; filename="{_safe_filename("reporte_cosecha", f"{base}_{fecha}", "xlsx")}"'
                )
                resp["X-Content-Type-Options"] = "nosniff"
                return resp

            return NotificationHandler.generate_response(
                message_key="reporte_generado_exitosamente",
                data={"reporte": reporte_data},
                status_code=status.HTTP_200_OK,
            )

        except PermissionDenied:
            return NotificationHandler.generate_response(
                message_key="permission_denied",
                status_code=status.HTTP_403_FORBIDDEN,
            )
        except ValidationError as e:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": getattr(e, "message_dict", {"detalle": str(e)})},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return NotificationHandler.generate_response(
                message_key="server_error",
                data={"error": str(e)},
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
