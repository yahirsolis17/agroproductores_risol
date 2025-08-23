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
from django.core.cache import cache

from gestion_huerta.services.reportes_produccion_service import ReportesProduccionService
# ⚠️ Ahora importamos desde utils (coincide con la ruta del archivo que pediste)
from gestion_huerta.services.exportacion_service import ExportacionService
from gestion_huerta.utils.notification_handler import NotificationHandler
from gestion_huerta.permissions import HasHuertaModulePermission

from gestion_huerta.models import Cosecha, Temporada, InversionesHuerta, Venta


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
            # Normalizamos IDs
            hid = _as_int(huerta_id, "huerta_id") if huerta_id is not None else None
            hrid = _as_int(huerta_rentada_id, "huerta_rentada_id") if huerta_rentada_id is not None else None

            reporte_data = ReportesProduccionService.generar_perfil_huerta(
                huerta_id=hid,
                huerta_rentada_id=hrid,
                usuario=request.user,
                años=años,
                formato="json",
            )

            if formato == "pdf":
                pdf = ExportacionService.generar_pdf_perfil_huerta(reporte_data)
                # Nombre de archivo según origen
                base = f"huerta_{hid}" if hid else f"huerta_rentada_{hrid}"
                resp = HttpResponse(pdf, content_type="application/pdf")
                resp["Content-Disposition"] = f'attachment; filename="perfil_{base}.pdf"'
                return resp

            if formato == "excel":
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

    # ------------
    # LIMPIAR CACHE
    # ------------
    @action(detail=False, methods=["post"], url_path="limpiar-cache")
    def limpiar_cache(self, request):
        """
        Limpia el caché de reportes (útil cuando se cargan datos masivos y se quiere forzar regeneración).
        """
        try:
            cache.clear()
            return NotificationHandler.generate_response(
                message_key="ok", data={"status": "cache_cleared"}, status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return NotificationHandler.generate_response(
                message_key="server_error", data={"error": str(e)}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # ------------
    # ESTADÍSTICAS RÁPIDAS (observabilidad)
    # ------------
    @action(detail=False, methods=["get"], url_path="estadisticas")
    def estadisticas(self, request):
        """
        Devuelve métricas rápidas para monitoreo:
        - conteos de cosechas/ventas/inversiones
        - totales agregados (ingresos, inversiones)
        - timestamp del sistema
        """
        try:
            cosechas = Cosecha.objects.filter(is_active=True).count()
            ventas = Venta.objects.filter(is_active=True).count()
            inversiones = InversionesHuerta.objects.filter(is_active=True).count()

            # Agregados (no críticos; si el modelo cambia no se rompe porque están en try)
            from django.db.models import Sum, F
            tot_ingreso = Venta.objects.filter(is_active=True).aggregate(v=Sum(F("num_cajas") * F("precio_por_caja")))["v"] or 0
            tot_inv = InversionesHuerta.objects.filter(is_active=True).aggregate(v=Sum(F("gastos_insumos") + F("gastos_mano_obra")))["v"] or 0

            data = {
                "cosechas_activas": cosechas,
                "ventas_registradas": ventas,
                "inversiones_registradas": inversiones,
                "total_ingresos": float(tot_ingreso),
                "total_inversiones": float(tot_inv),
            }
            return NotificationHandler.generate_response(
                message_key="ok",
                data=data,
                status_code=status.HTTP_200_OK,
            )
        except Exception as e:
            return NotificationHandler.generate_response(
                message_key="server_error", data={"error": str(e)}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
