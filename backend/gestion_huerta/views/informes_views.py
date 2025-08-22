# -*- coding: utf-8 -*-
"""
ViewSet de informes con 3 acciones GET:
 - /informes/cosechas/{id}/
 - /informes/temporadas/{id}/
 - /informes/huertas/{id}/perfil/
Devuelve siempre el contrato {kpis, series, tabla}.
"""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from gestion_huerta.models import Cosecha, Temporada, Huerta, HuertaRentada
from gestion_huerta.utils.notification_handler import NotificationHandler
from gestion_huerta.utils.audit import ViewSetAuditMixin
from gestion_usuarios.permissions import HasModulePermission
from gestion_huerta.utils.reporting import (
    build_cosecha_report,
    build_temporada_report,
    build_huerta_report,
)


class NotificationMixin:
    """Helper para respuestas uniformes"""

    def notify(self, *, key: str, data=None, status_code=status.HTTP_200_OK):
        return NotificationHandler.generate_response(
            message_key=key, data=data or {}, status_code=status_code
        )


class InformesViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.GenericViewSet):
    """Acciones de informes para cosechas, temporadas y huertas."""

    permission_classes = [IsAuthenticated, HasModulePermission]

    _perm_map = {
        "cosecha": ["view_cosecha"],
        "temporada": ["view_temporada"],
        "perfil": ["view_huerta"],
    }

    def get_permissions(self):  # pragma: no cover - mapea permisos por acción
        self.required_permissions = self._perm_map.get(self.action, ["view_huerta"])
        return [p() for p in self.permission_classes]

    # ------------------------------------------------------------------
    # /informes/cosechas/{id}/
    # ------------------------------------------------------------------
    @action(detail=False, methods=["get"], url_path=r"cosechas/(?P<cosecha_id>[^/.]+)")
    def cosecha(self, request, cosecha_id: str | None = None):
        try:
            cosecha = Cosecha.objects.get(pk=cosecha_id, is_active=True)
        except Cosecha.DoesNotExist:
            return self.notify(
                key="not_found",
                data={"cosecha_id": cosecha_id},
                status_code=status.HTTP_404_NOT_FOUND,
            )

        data = build_cosecha_report(cosecha)
        return self.notify(key="data_processed_success", data=data)

    # ------------------------------------------------------------------
    # /informes/temporadas/{id}/
    # ------------------------------------------------------------------
    @action(detail=False, methods=["get"], url_path=r"temporadas/(?P<temporada_id>[^/.]+)")
    def temporada(self, request, temporada_id: str | None = None):
        try:
            temporada = Temporada.objects.get(pk=temporada_id, is_active=True)
        except Temporada.DoesNotExist:
            return self.notify(
                key="not_found",
                data={"temporada_id": temporada_id},
                status_code=status.HTTP_404_NOT_FOUND,
            )

        data = build_temporada_report(temporada)
        return self.notify(key="data_processed_success", data=data)

    # ------------------------------------------------------------------
    # /informes/huertas/{id}/perfil/
    # ------------------------------------------------------------------
    @action(
        detail=False,
        methods=["get"],
        url_path=r"huertas/(?P<huerta_id>[^/.]+)/perfil",
    )
    def perfil(self, request, huerta_id: str | None = None):
        origen: Huerta | HuertaRentada | None = None
        try:
            origen = Huerta.objects.get(pk=huerta_id, is_active=True)
        except Huerta.DoesNotExist:
            try:
                origen = HuertaRentada.objects.get(pk=huerta_id, is_active=True)
            except HuertaRentada.DoesNotExist:
                return self.notify(
                    key="not_found",
                    data={"huerta_id": huerta_id},
                    status_code=status.HTTP_404_NOT_FOUND,
                )

        data = build_huerta_report(origen)
        return self.notify(key="data_processed_success", data=data)

