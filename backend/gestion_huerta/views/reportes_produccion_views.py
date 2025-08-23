# backend/gestion_huerta/views/reportes_produccion_views.py
# -*- coding: utf-8 -*-
"""
ViewSet robusto para reportes de producción con:
- Validaciones de entrada
- Manejo de permisos
- Respuestas consistentes con NotificationHandler
- Exportación PDF/Excel usando ExportacionService
- Endpoints: cosecha, temporada, perfil-huerta, limpiar-cache, estadisticas
"""

from __future__ import annotations

from typing import Optional

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

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


class ReportesProduccionViewSet(viewsets.GenericViewSet):
    """ViewSet para generar y exportar reportes de producción robustos"""

    permission_classes = [IsAuthenticated, HasHuertaModulePermission]

    # ------------
    # COSECHA
    # ------------
    @action(detail=False, methods=["post"], url_path="cosecha")
    def reporte_cosecha(self, request):
        """
        Genera reporte de una cosecha específica.

        Body:
        {
            "cosecha_id": int,              (obligatorio)
            "formato": "json|pdf|excel"     (opcional, default: json)
        }
        """
        cosecha_id_raw = request.data.get("cosecha_id")
        formato = (request.data.get("formato") or "json").strip().lower()

        if cosecha_id_raw is None:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": {"cosecha_id": "ID de cosecha requerido"}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if formato not in {"json", "pdf", "excel"}:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": {"formato": "Formato debe ser json, pdf o excel"}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            cosecha_id = _as_int(cosecha_id_raw, "cosecha_id")
            # Siempre generamos en JSON y luego exportamos si aplica
            reporte_data = ReportesProduccionService.generar_reporte_cosecha(
                cosecha_id=cosecha_id, usuario=request.user, formato="json"
            )

            if formato == "pdf":
                pdf = ExportacionService.generar_pdf_cosecha(reporte_data)
                resp = HttpResponse(pdf, content_type="application/pdf")
                resp["Content-Disposition"] = f'attachment; filename="reporte_cosecha_{cosecha_id}.pdf"'
                return resp

            if formato == "excel":
                excel = ExportacionService.generar_excel_cosecha(reporte_data)
                resp = HttpResponse(
                    excel, content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
                resp["Content-Disposition"] = f'attachment; filename="reporte_cosecha_{cosecha_id}.xlsx"'
                return resp

            # formato == json
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

    # ------------
    # TEMPORADA
    # ------------
    @action(detail=False, methods=["post"], url_path="temporada")
    def reporte_temporada(self, request):
        """
        Genera reporte de una temporada completa.

        Body:
        {
            "temporada_id": int,            (obligatorio)
            "formato": "json|pdf|excel"     (opcional, default: json)
        }
        """
        temporada_id_raw = request.data.get("temporada_id")
        formato = (request.data.get("formato") or "json").strip().lower()

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
                temporada_id=temporada_id, usuario=request.user, formato="json"
            )

            if formato == "pdf":
                pdf = ExportacionService.generar_pdf_temporada(reporte_data)
                resp = HttpResponse(pdf, content_type="application/pdf")
                resp["Content-Disposition"] = f'attachment; filename="reporte_temporada_{temporada_id}.pdf"'
                return resp

            if formato == "excel":
                excel = ExportacionService.generar_excel_temporada(reporte_data)
                resp = HttpResponse(
                    excel, content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
                resp["Content-Disposition"] = f'attachment; filename="reporte_temporada_{temporada_id}.xlsx"'
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

    # ------------
    # PERFIL HUERTA
    # ------------
    @action(detail=False, methods=["post"], url_path="perfil-huerta")
    def perfil_huerta(self, request):
        """
        Genera perfil histórico de una huerta.

        Body:
        {
            "huerta_id": int,               (opcional si se proporciona huerta_rentada_id)
            "huerta_rentada_id": int,       (opcional si se proporciona huerta_id)
            "años": int (1..10),            (opcional, default: 5)
            "formato": "json|pdf|excel"     (opcional, default: json)
        }
        """
        huerta_id = request.data.get("huerta_id")
        huerta_rentada_id = request.data.get("huerta_rentada_id")
        años_raw = request.data.get("años", 5)
        formato = (request.data.get("formato") or "json").strip().lower()

        # Validaciones rápidas
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

        if formato not in {"json", "pdf", "excel"}:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": {"formato": "Formato debe ser json, pdf o excel"}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            huerta_id_int = int(huerta_id) if huerta_id is not None else None
            huerta_rentada_id_int = int(huerta_rentada_id) if huerta_rentada_id is not None else None

            reporte_data = ReportesProduccionService.generar_perfil_huerta(
                huerta_id=huerta_id_int,
                huerta_rentada_id=huerta_rentada_id_int,
                usuario=request.user,
                años=años,
                formato="json",
            )

            if formato == "pdf":
                pdf = ExportacionService.generar_pdf_perfil_huerta(reporte_data)
                nombre = reporte_data.get("informacion_general", {}).get("huerta_nombre", "huerta").replace(" ", "_")
                resp = HttpResponse(pdf, content_type="application/pdf")
                resp["Content-Disposition"] = f'attachment; filename="perfil_huerta_{nombre}.pdf"'
                return resp

            if formato == "excel":
                excel = ExportacionService.generar_excel_perfil_huerta(reporte_data)
                nombre = reporte_data.get("informacion_general", {}).get("huerta_nombre", "huerta").replace(" ", "_")
                resp = HttpResponse(
                    excel, content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                )
                resp["Content-Disposition"] = f'attachment; filename="perfil_huerta_{nombre}.xlsx"'
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

    # ------------
    # CACHE
    # ------------
    @action(detail=False, methods=["post"], url_path="limpiar-cache")
    def limpiar_cache(self, request):
        """
        Limpia el cache de reportes (solo administradores).

        Body:
        {
            "tipo": "all|cosecha|temporada|perfil_huerta"   (opcional, default: all)
            "entidad_id": int                               (opcional, clave específica)
        }
        """
        if not getattr(request.user, "is_superuser", False):
            return NotificationHandler.generate_response(
                message_key="permission_denied", status_code=status.HTTP_403_FORBIDDEN
            )

        tipo = (request.data.get("tipo") or "all").lower().strip()
        _ = request.data.get("entidad_id")  # hoy no aplicamos invalidación selectiva por patrón

        try:
            from django.core.cache import cache

            # En una versión posterior puedes aplicar invalidación selectiva si usas naming por prefijos
            cache.clear()
            msg = "Cache completo limpiado exitosamente" if tipo == "all" else f"Cache de {tipo} limpiado"
            return NotificationHandler.generate_response(
                message_key="operation_success", data={"mensaje": msg}, status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return NotificationHandler.generate_response(
                message_key="server_error", data={"error": str(e)}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # ------------
    # ESTADÍSTICAS (stub)
    # ------------
    @action(detail=False, methods=["get"], url_path="estadisticas")
    def estadisticas_reportes(self, request):
        """
        Obtiene estadísticas de uso de reportes (solo administradores).
        """
        if not getattr(request.user, "is_superuser", False):
            return NotificationHandler.generate_response(
                message_key="permission_denied", status_code=status.HTTP_403_FORBIDDEN
            )

        # Nota: en un entorno real, estas métricas vendrían de logs/monitoring.
        estadisticas = {
            "reportes_generados_hoy": 0,
            "reportes_generados_semana": 0,
            "reportes_generados_mes": 0,
            "tipos_mas_solicitados": {"cosecha": 0, "temporada": 0, "perfil_huerta": 0},
            "formatos_mas_solicitados": {"json": 0, "pdf": 0, "excel": 0},
            "tiempo_promedio_generacion": "0.0s",
            "cache_hit_rate": "0%",
        }
        return NotificationHandler.generate_response(
            message_key="data_retrieved_successfully", data={"estadisticas": estadisticas}, status_code=status.HTTP_200_OK
        )
