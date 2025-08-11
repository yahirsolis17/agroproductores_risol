# gestion_huerta/views/inversion_views.py
from rest_framework import viewsets, filters, status, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from gestion_huerta.utils.audit   import ViewSetAuditMixin
from gestion_huerta.views.huerta_views import NotificationMixin
from gestion_huerta.permissions import HasHuertaModulePermission, HuertaGranularPermission
from agroproductores_risol.utils.pagination import GenericPagination
from gestion_huerta.utils.activity import registrar_actividad

from gestion_huerta.models import InversionesHuerta
from gestion_huerta.serializers import InversionesHuertaSerializer


class InversionHuertaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    Gestiona inversiones por cosecha: CRUD + archivar/restaurar (POST|PATCH),
    filtros por cosecha/temporada/categoría/huerta/huerta_rentada + estado (activas|archivadas|todas)
    y rango de fechas (fecha_desde / fecha_hasta, inclusive).
    """
    queryset = (
        InversionesHuerta.objects
        .select_related('categoria', 'cosecha', 'temporada', 'huerta', 'huerta_rentada')
        .order_by('-fecha', '-id')
    )
    serializer_class   = InversionesHuertaSerializer
    pagination_class   = GenericPagination
    permission_classes = [IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['cosecha', 'temporada', 'categoria', 'huerta', 'huerta_rentada']
    search_fields      = ['descripcion']
    ordering_fields    = ['fecha', 'id']

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        # En acciones de detalle, no limitar por estado/rangos
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy', 'archivar', 'restaurar']:
            return qs

        # Estado: activas / archivadas / todas
        estado = (params.get('estado') or 'activas').strip().lower()
        if estado == 'activas':
            qs = qs.filter(is_active=True)
        elif estado == 'archivadas':
            qs = qs.filter(is_active=False)
        # 'todas' => sin filtro

        # Rango de fechas (inclusive). Espera YYYY-MM-DD
        fd = params.get('fecha_desde')
        fh = params.get('fecha_hasta')

        from datetime import datetime
        def parse_date(val: str):
            try:
                return datetime.strptime(val, '%Y-%m-%d').date()
            except Exception:
                return None

        if fd:
            d = parse_date(fd)
            if d:
                qs = qs.filter(fecha__gte=d)
        if fh:
            d = parse_date(fh)
            if d:
                qs = qs.filter(fecha__lte=d)

        return qs

    # ------------------------------ LIST
    def list(self, request, *args, **kwargs):
        page       = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        serializer = self.get_serializer(page, many=True)
        return self.notify(
            key="data_processed_success",
            data={
                "inversiones": serializer.data,
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
            # Notificación genérica (los mensajes detallados van en errors por campo)
            return self.notify(
                key="validation_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_create(ser)
        inv = ser.instance
        registrar_actividad(request.user, f"Creó inversión {inv.id} en cosecha {inv.cosecha_id}")
        return self.notify(
            key="inversion_create_success",
            data={"inversion": ser.data},
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
        registrar_actividad(request.user, f"Actualizó inversión {inst.id}")
        return self.notify(
            key="inversion_update_success",
            data={"inversion": ser.data},
            status_code=status.HTTP_200_OK,
        )

    # ------------------------------ DELETE (solo si está archivada)
    def destroy(self, request, *args, **kwargs):
        inv = self.get_object()
        if inv.is_active:
            return self.notify(
                key="inversion_debe_estar_archivada",
                data={"error": "Debes archivar la inversión antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_destroy(inv)
        registrar_actividad(request.user, f"Eliminó inversión {inv.id}")
        return self.notify(
            key="inversion_delete_success",
            data={"info": "Inversión eliminada."},
            status_code=status.HTTP_200_OK,
        )

    # ------------------------------ ACCIONES: archivar/restaurar (POST|PATCH)
    @action(detail=True, methods=["post", "patch"], url_path="archivar")
    def archivar(self, request, pk=None):
        inv = self.get_object()
        if not inv.is_active:
            return self.notify(key="inversion_ya_archivada", status_code=status.HTTP_400_BAD_REQUEST)
        inv.archivar()
        registrar_actividad(request.user, f"Archivó inversión {inv.id}")
        return self.notify(
            key="inversion_archivada",
            data={"inversion": self.get_serializer(inv).data},
            status_code=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post", "patch"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        inv = self.get_object()
        if inv.is_active:
            return self.notify(key="inversion_no_archivada", status_code=status.HTTP_400_BAD_REQUEST)
        inv.desarchivar()
        registrar_actividad(request.user, f"Restauró inversión {inv.id}")
        return self.notify(
            key="inversion_restaurada",
            data={"inversion": self.get_serializer(inv).data},
            status_code=status.HTTP_200_OK,
        )
