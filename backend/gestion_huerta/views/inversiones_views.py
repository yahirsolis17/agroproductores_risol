# backend/gestion_huerta/views/inversiones_views.py
from rest_framework import viewsets, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from gestion_huerta.models import InversionesHuerta
from gestion_huerta.serializers import InversionesHuertaSerializer
from gestion_huerta.views.huerta_views import NotificationMixin
from gestion_huerta.permissions import HasHuertaModulePermission, HuertaGranularPermission
from agroproductores_risol.utils.pagination import GenericPagination

class InversionHuertaViewSet(NotificationMixin, viewsets.ModelViewSet):
    """
    Gestiona inversiones por cosecha: list, create, update, delete + archivar/restaurar
    """
    queryset = InversionesHuerta.objects.select_related('categoria','cosecha','huerta').order_by('-fecha')
    serializer_class = InversionesHuertaSerializer
    pagination_class = GenericPagination
    permission_classes = [IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['cosecha', 'categoria']
    search_fields = ['nombre', 'descripcion']

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
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
            }
        )

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
        return self.notify(
            key="inversion_create_success",
            data={"inversion": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial  = kwargs.pop("partial", False)
        instance = self.get_object()
        ser      = self.get_serializer(instance, data=request.data, partial=partial)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_update(ser)
        return self.notify(
            key="inversion_update_success",
            data={"inversion": ser.data},
        )

    def destroy(self, request, *args, **kwargs):
        instancia = self.get_object()
        self.perform_destroy(instancia)
        return self.notify(
            key="inversion_delete_success",
            data={"info": "Inversión eliminada."}
        )

    @action(detail=True, methods=["patch"], url_path="archivar")
    def archivar(self, request, pk=None):
        inv = self.get_object()
        if not inv.is_active:
            return self.notify(key="inversion_ya_archivada", status_code=status.HTTP_400_BAD_REQUEST)
        inv.is_active = False
        inv.archivado_en = timezone.now()
        inv.save(update_fields=["is_active","archivado_en"])
        return self.notify(
            key="inversion_archivada",
            data={"inversion": self.get_serializer(inv).data}
        )

    @action(detail=True, methods=["patch"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        inv = self.get_object()
        if inv.is_active:
            return self.notify(key="inversion_no_archivada", status_code=status.HTTP_400_BAD_REQUEST)
        inv.is_active = True
        inv.archivado_en = None
        inv.save(update_fields=["is_active","archivado_en"])
        return self.notify(
            key="inversion_restaurada",
            data={"inversion": self.get_serializer(inv).data}
        )
