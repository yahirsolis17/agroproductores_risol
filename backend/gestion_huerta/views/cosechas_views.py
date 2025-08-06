# gestion_huerta/views/cosecha_views.py
from django.utils import timezone
from django.db.models import Q
from rest_framework import status, viewsets, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from gestion_huerta.models import Cosecha, Temporada
from gestion_huerta.serializers import CosechaSerializer
from gestion_huerta.utils.notification_handler import NotificationHandler
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.utils.audit import ViewSetAuditMixin
from agroproductores_risol.utils.pagination import GenericPagination
from gestion_huerta.permissions import HasHuertaModulePermission, HuertaGranularPermission

# Reusar el mixin de tus otras vistas (respuestas uniformes)
class NotificationMixin:
    def notify(self, *, key: str, data=None, status_code=status.HTTP_200_OK):
        return NotificationHandler.generate_response(
            message_key=key,
            data=data or {},
            status_code=status_code,
        )

class CosechaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de Cosechas + acciones custom (finalizar/reactivar, archivar, restaurar).
    Pagina y filtra igual que el resto del módulo.
    """
    queryset = Cosecha.objects.select_related("temporada", "huerta", "huerta_rentada").order_by("-id")
    serializer_class = CosechaSerializer
    pagination_class = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    # ----------------------------- QUERYSET DINÁMICO
    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        # No forzar filtros en acciones de detalle
        if self.action in ['archivar', 'restaurar', 'finalizar', 'retrieve', 'destroy']:
            return qs

        # Filtro por estado (activos/archivados/todas)
        estado = (params.get("estado") or "activos").lower()
        if estado == "activos":
            qs = qs.filter(is_active=True)
        elif estado == "archivados":
            qs = qs.filter(is_active=False)

        # Filtro por finalizada
        finalizada = params.get("finalizada")
        if finalizada is not None:
            val = finalizada.lower()
            if val in ("true", "1"):
                qs = qs.filter(finalizada=True)
            elif val in ("false", "0"):
                qs = qs.filter(finalizada=False)

        # Filtro por temporada / origen
        if (t_id := params.get("temporada")):
            qs = qs.filter(temporada_id=t_id)
        if (h_id := params.get("huerta")):
            qs = qs.filter(huerta_id=h_id)
        if (hr_id := params.get("huerta_rentada")):
            qs = qs.filter(huerta_rentada_id=hr_id)

        # Búsqueda por nombre
        if (search := (params.get("search") or "").strip()):
            qs = qs.filter(nombre__icontains=search)
            self.pagination_class.page_size = 10

        return qs

    # ----------------------------- LIST
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page     = self.paginate_queryset(queryset)

        if page is not None:
            ser = self.get_serializer(page, many=True)
            return self.notify(
                key="data_processed_success",
                data={
                    "cosechas": ser.data,
                    "meta": {
                        "count": self.paginator.page.paginator.count,
                        "next": self.paginator.get_next_link(),
                        "previous": self.paginator.get_previous_link(),
                    }
                }
            )

        ser = self.get_serializer(queryset, many=True)
        return self.notify(key="data_processed_success", data={"cosechas": ser.data})

    # ----------------------------- RETRIEVE
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        ser = self.get_serializer(instance)
        return self.notify(key="data_processed_success", data={"cosecha": ser.data})

    # ----------------------------- CREATE
    def create(self, request, *args, **kwargs):
        data = request.data.copy()

        # Normalizar campos vacíos
        for f in ("fecha_inicio", "fecha_fin"):
            if f in data and (data[f] in ["", None, "null", "None"]):
                data.pop(f)

        ser = self.get_serializer(data=data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST
            )

        self.perform_create(ser)
        registrar_actividad(request.user, f"Creó la cosecha: {ser.validated_data.get('nombre')}")
        return self.notify(
            key="cosecha_create_success",
            data={"cosecha": ser.data},
            status_code=status.HTTP_201_CREATED
        )

    # ----------------------------- UPDATE / PARTIAL_UPDATE
    def update(self, request, *args, **kwargs):
        partial   = kwargs.pop("partial", False)
        instance  = self.get_object()
        ser       = self.get_serializer(instance, data=request.data, partial=partial)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST
            )

        self.perform_update(ser)
        registrar_actividad(request.user, f"Actualizó la cosecha: {instance.nombre}")
        return self.notify(
            key="cosecha_update_success",
            data={"cosecha": ser.data},
            status_code=status.HTTP_200_OK
        )

    # ----------------------------- DELETE
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        # Igual que Huerta: exigir archivada antes de borrar
        if instance.is_active:
            return self.notify(
                key="cosecha_debe_estar_archivada",
                data={"error": "Debes archivar la cosecha antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # No permitir eliminar si tiene dependencias
        if instance.inversiones.exists() or instance.ventas.exists():
            return self.notify(
                key="cosecha_con_dependencias",
                data={"error": "No se puede eliminar. Tiene inversiones o ventas registradas."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        nombre = instance.nombre
        self.perform_destroy(instance)
        registrar_actividad(request.user, f"Eliminó la cosecha: {nombre}")

        return self.notify(
            key="cosecha_delete_success",
            data={"info": f"Cosecha '{nombre}' eliminada."},
            status_code=status.HTTP_200_OK,
        )

    # ----------------------------- ACCIONES CUSTOM
    @action(detail=True, methods=["post"], url_path="finalizar")
    def finalizar(self, request, pk=None):
        c = self.get_object()
        if not c.finalizada:
            c.finalizada = True
            c.fecha_fin  = timezone.now()
            c.save(update_fields=["finalizada", "fecha_fin"])
            registrar_actividad(request.user, f"Finalizó la cosecha: {c.nombre}")
            key = "cosecha_finalizada"
        else:
            c.finalizada = False
            c.fecha_fin  = None
            c.save(update_fields=["finalizada", "fecha_fin"])
            registrar_actividad(request.user, f"Reactivó la cosecha: {c.nombre}")
            key = "cosecha_reactivada"

        return self.notify(key=key, data={"cosecha": self.get_serializer(c).data})

    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        c = self.get_object()
        if not c.is_active:
            return self.notify(
                key="cosecha_ya_archivada",
                data={"info": "Esta cosecha ya está archivada."},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        c.archivar()
        registrar_actividad(request.user, f"Archivó la cosecha: {c.nombre}")
        return self.notify(key="cosecha_archivada", data={"cosecha": self.get_serializer(c).data})

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        c = self.get_object()
        if c.is_active:
            return self.notify(
                key="cosecha_ya_activa",
                data={"info": "Esta cosecha ya está activa."},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        c.desarchivar()
        registrar_actividad(request.user, f"Restauró la cosecha: {c.nombre}")
        return self.notify(key="cosecha_restaurada", data={"cosecha": self.get_serializer(c).data})
