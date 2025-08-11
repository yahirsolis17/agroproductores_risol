from rest_framework import viewsets, filters, status, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from datetime import datetime

from gestion_huerta.models import Venta
from gestion_huerta.serializers import VentaSerializer
from gestion_huerta.views.huerta_views import NotificationMixin
from gestion_huerta.permissions import HasHuertaModulePermission, HuertaGranularPermission
from agroproductores_risol.utils.pagination import GenericPagination
from gestion_huerta.utils.activity import registrar_actividad

class VentaViewSet(NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de ventas por cosecha + archivar/restaurar,
    con filtros por cosecha, temporada, huerta, huerta_rentada, tipo_mango,
    estado (activas|archivadas|todas) y rango de fechas (fecha_desde/fecha_hasta).
    """
    queryset           = Venta.objects.select_related('cosecha', 'temporada', 'huerta', 'huerta_rentada').order_by('-fecha_venta')
    serializer_class   = VentaSerializer
    pagination_class   = GenericPagination
    permission_classes = [IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['cosecha', 'temporada', 'huerta', 'huerta_rentada', 'tipo_mango']
    search_fields      = ['tipo_mango', 'descripcion']
    ordering_fields    = ['fecha_venta']

    def get_queryset(self):
        """
        Filtra por estado (activas/archivadas/todas) y por rango de fechas,
        excepto en acciones de detalle, archivar/restaurar o destroy.
        """
        qs = super().get_queryset()
        params = self.request.query_params

        # Excluir filtros en acciones de detalle
        if self.action not in ['retrieve', 'update', 'partial_update', 'destroy', 'archivar', 'restaurar']:
            # Filtro por estado: 'activas', 'archivadas' o 'todas'
            estado = (params.get('estado') or 'activas').strip().lower()
            if estado == 'activas':
                qs = qs.filter(is_active=True)
            elif estado == 'archivadas':
                qs = qs.filter(is_active=False)
            # 'todas' -> sin filtro

            # Filtro por rango de fechas (inclusive). Recibe YYYY-MM-DD
            def parse_date(val: str):
                try:
                    return datetime.strptime(val, '%Y-%m-%d').date()
                except Exception:
                    return None

            fd = params.get('fecha_desde')
            fh = params.get('fecha_hasta')
            if fd:
                d = parse_date(fd)
                if d:
                    qs = qs.filter(fecha_venta__gte=d)
            if fh:
                d = parse_date(fh)
                if d:
                    qs = qs.filter(fecha_venta__lte=d)

        return qs

    # ------------------------------ LIST
    def list(self, request, *args, **kwargs):
        page       = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        serializer = self.get_serializer(page, many=True)
        return self.notify(
            key="data_processed_success",
            data={
                "ventas": serializer.data,
                "meta": {
                    "count": self.paginator.page.paginator.count,
                    "next": self.paginator.get_next_link(),
                    "previous": self.paginator.get_previous_link(),
                }
            },
            status_code=status.HTTP_200_OK
        )

    # ------------------------------ CREATE
    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_create(ser)
        venta = ser.instance
        registrar_actividad(request.user, f"Creó venta {venta.id} en cosecha {venta.cosecha.id}")
        return self.notify(
            key="venta_create_success",
            data={"venta": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    # ------------------------------ UPDATE
    def update(self, request, *args, **kwargs):
        partial  = kwargs.pop("partial", False)
        inst     = self.get_object()
        ser      = self.get_serializer(inst, data=request.data, partial=partial)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_update(ser)
        registrar_actividad(request.user, f"Actualizó venta {inst.id}")
        return self.notify(
            key="venta_update_success",
            data={"venta": ser.data},
            status_code=status.HTTP_200_OK,
        )

    # ------------------------------ DELETE (solo si está archivada)
    def destroy(self, request, *args, **kwargs):
        venta = self.get_object()
        if venta.is_active:
            return self.notify(
                key="venta_debe_estar_archivada",
                data={"error": "Debes archivar la venta antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_destroy(venta)
        registrar_actividad(request.user, f"Eliminó venta {venta.id}")
        return self.notify(
            key="venta_delete_success",
            data={"info": "Venta eliminada."},
            status_code=status.HTTP_200_OK,
        )

    # ------------------------------ ARCHIVAR/RESTAURAR
    @action(detail=True, methods=["post", "patch"], url_path="archivar")
    def archivar(self, request, pk=None):
        venta = self.get_object()
        if not venta.is_active:
            return self.notify(key="venta_ya_archivada",
                               status_code=status.HTTP_400_BAD_REQUEST)
        venta.archivar()
        registrar_actividad(request.user, f"Archivó venta {venta.id}")
        return self.notify(
            key="venta_archivada",
            data={"venta": self.get_serializer(venta).data},
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post", "patch"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        venta = self.get_object()
        if venta.is_active:
            return self.notify(key="venta_no_archivada",
                               status_code=status.HTTP_400_BAD_REQUEST)
        venta.desarchivar()
        registrar_actividad(request.user, f"Restauró venta {venta.id}")
        return self.notify(
            key="venta_restaurada",
            data={"venta": self.get_serializer(venta).data},
            status_code=status.HTTP_200_OK,
        )
