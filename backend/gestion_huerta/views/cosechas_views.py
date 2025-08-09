# src/modules/gestion_huerta/views/cosecha_views.py

from django.utils import timezone
from rest_framework import viewsets, status, serializers, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from gestion_huerta.models import Cosecha, Temporada
from gestion_huerta.serializers import CosechaSerializer
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.utils.audit import ViewSetAuditMixin
from agroproductores_risol.utils.pagination import GenericPagination
from gestion_huerta.views.huerta_views import NotificationMixin
from gestion_huerta.permissions import HasHuertaModulePermission, HuertaGranularPermission


class CosechaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de cosechas + acciones custom (archivar, restaurar, finalizar, toggle-finalizada, reactivar)
    con integridad de datos (soft‐delete, cascada, validaciones) y notificaciones uniformes.
    """
    serializer_class   = CosechaSerializer
    queryset           = Cosecha.objects.select_related("temporada", "huerta", "huerta_rentada").order_by("-id")
    pagination_class   = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]
    filter_backends = [filters.SearchFilter]
    search_fields   = ['nombre']

    # ------------------------------ QUERYSET DINÁMICO
    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        # Incluir todas en acciones de detalle
        if self.action in [
            'retrieve', 'update', 'partial_update', 'destroy',
            'archivar', 'restaurar', 'finalizar', 'toggle_finalizada', 'reactivar'
        ]:
            return qs

        # Filtro por temporada
        if temp_id := params.get("temporada"):
            qs = qs.filter(temporada_id=temp_id)

        # Filtro por estado activo/archivado
        estado = params.get("estado", "activas")
        if estado == "activas":
            qs = qs.filter(is_active=True)
        elif estado == "archivadas":
            qs = qs.filter(is_active=False)

        # Búsqueda por nombre
        if search := params.get("search"):
            qs = qs.filter(nombre__icontains=search)
            self.pagination_class.page_size = 10

        return qs.order_by("-id")

    # ------------------------------ LIST
    def list(self, request, *args, **kwargs):
        page       = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        serializer = self.get_serializer(page, many=True)
        return self.notify(
            key="data_processed_success",
            data={
                "cosechas": serializer.data,
                "meta": {
                    "count": self.paginator.page.paginator.count,
                    "next": self.paginator.get_next_link(),
                    "previous": self.paginator.get_previous_link(),
                }
            }
        )

    # ------------------------------ CREACIÓN (con nombre único)
    def _nombre_unico(self, temporada: Temporada, propuesto: str | None) -> str:
        base = (propuesto or "").strip() or "Cosecha"
        existentes = set(temporada.cosechas.values_list("nombre", flat=True))
        if base not in existentes:
            return base
        i = 2
        while True:
            cand = f"{base} {i}"
            if cand not in existentes:
                return cand
            i += 1

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        for f in ("fecha_inicio", "fecha_fin"):
            if f in data and data[f] in [None, "", "null", "None"]:
                data[f] = None

        serializer = self.get_serializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="cosecha_limite_temporada",
                data={"errors": serializer.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        temporada = serializer.validated_data["temporada"]
        nombre    = self._nombre_unico(temporada, serializer.validated_data.get("nombre"))
        instance  = serializer.save(nombre=nombre, is_active=True, archivado_en=None)

        registrar_actividad(request.user, f"Creó la cosecha: {instance.nombre}")
        return self.notify(
            key="cosecha_create_success",
            data={"cosecha": self.get_serializer(instance).data},
            status_code=status.HTTP_201_CREATED,
        )

    # ------------------------------ ACTUALIZACIÓN
    def update(self, request, *args, **kwargs):
        partial    = kwargs.pop("partial", False)
        instance   = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": serializer.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_update(serializer)
        return self.notify(
            key="cosecha_update_success",
            data={"cosecha": serializer.data},
        )

    # ------------------------------ ELIMINACIÓN (soft‐delete primero)
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        # Debe estar archivada
        if instance.is_active:
            return self.notify(
                key="cosecha_debe_estar_archivada",
                data={"error": "Debes archivar la cosecha antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        # No puede borrar si tiene inversiones o ventas asociadas
        if instance.inversiones.exists() or instance.ventas.exists():
            return self.notify(
                key="cosecha_con_dependencias",
                data={"error": "No se puede eliminar. Tiene registros de inversiones o ventas asociadas."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_destroy(instance)
        return self.notify(
            key="cosecha_delete_success",
            data={"info": "Cosecha eliminada."},
        )

    # ------------------------------ ACCIONES CUSTOM
    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        c = self.get_object()
        if not c.is_active:
            return self.notify(key="cosecha_ya_archivada", status_code=status.HTTP_400_BAD_REQUEST)
        c.archivar()
        registrar_actividad(request.user, f"Archivó la cosecha: {c.nombre}")
        return self.notify(key="cosecha_archivada", data={"cosecha": self.get_serializer(c).data})

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        c = self.get_object()
        if c.is_active:
            return self.notify(key="cosecha_no_archivada", status_code=status.HTTP_400_BAD_REQUEST)
        c.desarchivar()
        registrar_actividad(request.user, f"Restauró la cosecha: {c.nombre}")
        return self.notify(key="cosecha_restaurada", data={"cosecha": self.get_serializer(c).data})

    @action(detail=True, methods=["post"], url_path="finalizar")
    def finalizar(self, request, pk=None):
        c = self.get_object()
        if c.finalizada:
            return self.notify(key="cosecha_ya_finalizada", status_code=status.HTTP_400_BAD_REQUEST)
        c.finalizar()
        registrar_actividad(request.user, f"Finalizó la cosecha: {c.nombre}")
        return self.notify(key="cosecha_finalizada", data={"cosecha": self.get_serializer(c).data})

    @action(detail=True, methods=["post"], url_path="toggle-finalizada")
    def toggle_finalizada(self, request, pk=None):
        c = self.get_object()
        if not c.finalizada:
            c.finalizar()
            key, msg = "cosecha_finalizada", "Finalizó"
        else:
            c.finalizada = False
            c.fecha_fin = None
            c.save(update_fields=["finalizada", "fecha_fin"])
            key, msg = "cosecha_reactivada", "Reactivó"
        registrar_actividad(request.user, f"{msg} la cosecha: {c.nombre}")
        return self.notify(key=key, data={"cosecha": self.get_serializer(c).data})

    @action(detail=True, methods=["post"], url_path="reactivar")
    def reactivar(self, request, pk=None):
        # Alias para deshacer la finalización
        return self.toggle_finalizada(request, pk)
