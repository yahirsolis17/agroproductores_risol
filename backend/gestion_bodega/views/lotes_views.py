# backend/gestion_bodega/views/lotes_views.py
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from gestion_bodega.models import LoteBodega
from gestion_bodega.permissions import HasModulePermission
from gestion_bodega.utils.audit import ViewSetAuditMixin
from agroproductores_risol.utils.pagination import GenericPagination
from agroproductores_risol.utils.notification_handler import NotificationHandler

from rest_framework import serializers

class LoteBodegaSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoteBodega
        fields = ["id", "bodega", "temporada", "semana", "codigo_lote", "origen_nombre", "notas", "creado_en"]
        read_only_fields = ["bodega", "temporada", "semana", "creado_en"]

class LoteBodegaViewSet(ViewSetAuditMixin, viewsets.ReadOnlyModelViewSet):
    """
    Vista de solo lectura para Lotes (se crean vía Recepción).
    Permite búsqueda para autocompletado.
    """
    queryset = LoteBodega.objects.all().order_by("-creado_en")
    serializer_class = LoteBodegaSerializer
    pagination_class = GenericPagination
    permission_classes = [IsAuthenticated, HasModulePermission]

    _perm_map = {
        "list": ["view_recepcion"], # Reutilizamos permiso de recepción
        "retrieve": ["view_recepcion"],
        "resumen": ["view_recepcion"],
    }

    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = {
        "bodega": ["exact"],
        "temporada": ["exact"],
        "semana": ["exact"],
        "codigo_lote": ["exact", "icontains"],
    }
    search_fields = ["codigo_lote", "origen_nombre"]

    def get_permissions(self):
        self.required_permissions = self._perm_map.get(self.action, [])
        return super().get_permissions()

    @action(detail=True, methods=["get"])
    def resumen(self, request, pk=None):
        """
        Retorna resumen de lo recibido y empacado para este lote.
        """
        lote = self.get_object()
        
        # Calcular agregados simples
        recepciones = lote.recepciones.filter(is_active=True)
        cajas_recibidas = sum(r.cajas_campo for r in recepciones)
        
        empaques = lote.clasificaciones.filter(is_active=True)
        cajas_empacadas = sum(e.cantidad_cajas for e in empaques)
        
        data = {
            "id": lote.id,
            "codigo": lote.codigo_lote,
            "total_recibido": cajas_recibidas,
            "total_empacado": cajas_empacadas,
            "recepciones_count": recepciones.count(),
            "empaques_count": empaques.count(),
        }
        return NotificationHandler.generate_response(
            message_key="fetched", # clave genérica
            data=data,
            status_code=status.HTTP_200_OK
        )
