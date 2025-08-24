# -*- coding: utf-8 -*-
from __future__ import annotations

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.core.cache import cache
from django.core.exceptions import ValidationError
from gestion_huerta.utils.notification_handler import NotificationHandler
from gestion_huerta.permissions import HasHuertaModulePermission

from gestion_huerta.models import Cosecha, InversionesHuerta, Venta
from celery.result import AsyncResult
from django.db.models import Sum, F


class ReportesUtilViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, HasHuertaModulePermission]

    @action(detail=False, methods=["get"], url_path=r"estado-export/(?P<job_id>[^/]+)")
    def estado_export(self, request, job_id=None):
        res = AsyncResult(job_id)
        payload = {"job_id": job_id, "estado": res.status}
        if res.successful():
            info = res.result or {}
            payload.update({"url": info.get("url"), "path": info.get("path")})
        elif res.failed():
            payload.update({"error": str(res.result)})
        return NotificationHandler.generate_response(message_key="ok", data=payload, status_code=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="limpiar-cache")
    def limpiar_cache(self, request):
        try:
            cache.clear()
            return NotificationHandler.generate_response(
                message_key="ok", data={"status": "cache_cleared"}, status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return NotificationHandler.generate_response(
                message_key="server_error", data={"error": str(e)}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=["get"], url_path="estadisticas")
    def estadisticas(self, request):
        try:
            cosechas = Cosecha.objects.filter(is_active=True).count()
            ventas = Venta.objects.filter(is_active=True).count()
            inversiones = InversionesHuerta.objects.filter(is_active=True).count()
            tot_ingreso = Venta.objects.filter(is_active=True).aggregate(v=Sum(F("num_cajas") * F("precio_por_caja")))["v"] or 0
            tot_inv = InversionesHuerta.objects.filter(is_active=True).aggregate(v=Sum(F("gastos_insumos") + F("gastos_mano_obra")))["v"] or 0
            data = {
                "cosechas_activas": cosechas,
                "ventas_registradas": ventas,
                "inversiones_registradas": inversiones,
                "total_ingresos": float(tot_ingreso),
                "total_inversiones": float(tot_inv),
            }
            return NotificationHandler.generate_response(message_key="ok", data=data, status_code=status.HTTP_200_OK)
        except Exception as e:
            return NotificationHandler.generate_response(
                message_key="server_error", data={"error": str(e)}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
