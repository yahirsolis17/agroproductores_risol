# src/modules/gestion_huerta/views/temporada_views.py
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Q, CharField
from django.db.models.functions import Cast
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from gestion_huerta.models       import Temporada, Huerta, HuertaRentada
from gestion_huerta.serializers  import TemporadaSerializer
from gestion_huerta.utils.notification_handler import NotificationHandler
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.utils.audit   import ViewSetAuditMixin
from gestion_huerta.views.huerta_views import NotificationMixin
from agroproductores_risol.utils.pagination import TemporadaPagination
from gestion_huerta.permissions   import HasHuertaModulePermission, HuertaGranularPermission


class TemporadaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de temporadas + acciones custom (finalizar/reenable; archivar/restaurar).
    Respuestas uniformes y auditoría automática.
    """
    queryset           = Temporada.objects.select_related("huerta", "huerta_rentada").order_by("-año")
    serializer_class   = TemporadaSerializer
    pagination_class   = TemporadaPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    # ------------------------------ QUERYSET DINÁMICO ------------------------------
    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        # Para acciones de detalle, no filtrar por estado
        if self.action in ['archivar', 'restaurar', 'retrieve', 'destroy', 'finalizar', 'update', 'partial_update']:
            return qs

        # Filtro por año
        if (year := params.get("año")):
            qs = qs.filter(año=year)

        # Filtro por huerta propia
        if (h_id := params.get("huerta")):
            qs = qs.filter(huerta_id=h_id)

        # Filtro por huerta rentada
        if (hr_id := params.get("huerta_rentada")):
            qs = qs.filter(huerta_rentada_id=hr_id)

        # Estado (activa/archivada/todas)
        estado = (params.get("estado") or "activas").lower()
        if estado == "activas":
            qs = qs.filter(is_active=True)
        elif estado == "archivadas":
            qs = qs.filter(is_active=False)

        # Estado de finalización (en_curso/finalizadas/todas)
        if (fin_estado := params.get("estado_finalizacion")):
            fin_estado = fin_estado.lower()
            if fin_estado == "en_curso":
                qs = qs.filter(finalizada=False)
            elif fin_estado == "finalizadas":
                qs = qs.filter(finalizada=True)

        # (compat) finalizada=true/false
        finalizada = params.get("finalizada")
        if finalizada is not None:
            low = finalizada.lower()
            if low in ('true', '1'):
                qs = qs.filter(finalizada=True)
            elif low in ('false', '0'):
                qs = qs.filter(finalizada=False)

        # Búsqueda libre (año / nombres / propietarios)
        if (search := params.get("search")):
            qs = qs.annotate(año_txt=Cast("año", CharField())).filter(
                Q(año_txt__icontains=search) |
                Q(huerta__nombre__icontains=search) |
                Q(huerta_rentada__nombre__icontains=search) |
                Q(huerta__propietario__nombre__icontains=search) |
                Q(huerta__propietario__apellidos__icontains=search) |
                Q(huerta_rentada__propietario__nombre__icontains=search) |
                Q(huerta_rentada__propietario__apellidos__icontains=search)
            )

        return qs

    # ---------------------------------- LIST ----------------------------------
    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        ser  = self.get_serializer(page, many=True)

        return self.notify(
            key="data_processed_success",
            data={
                "temporadas": ser.data,
                "meta": {
                    "count": self.paginator.page.paginator.count,
                    "next":  self.paginator.get_next_link(),
                    "previous": self.paginator.get_previous_link(),
                }
            },
            status_code=status.HTTP_200_OK
        )

    # --------------------------------- CREATE ---------------------------------
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        # Normaliza nulls
        for f in ("huerta", "huerta_rentada"):
            if f in data and data[f] in [None, "", "null", "None"]:
                data.pop(f)

        ser = self.get_serializer(data=data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": ser.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        self.perform_create(ser)
        registrar_actividad(request.user, f"Creó temporada {ser.data.get('año')}")
        return self.notify(
            key="temporada_create_success",
            data={"temporada": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    # --------------------------------- UPDATE ---------------------------------
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
        registrar_actividad(request.user, f"Actualizó temporada {ser.data.get('año')}")
        return self.notify(
            key="temporada_update_success",
            data={"temporada": ser.data},
        )

    # --------------------------------- DELETE ---------------------------------
    def destroy(self, request, *args, **kwargs):
        temp = self.get_object()
        if temp.cosechas.exists():
            return self.notify(
                key="temporada_con_dependencias",
                data={"error": "No se puede eliminar. Tiene cosechas asociadas."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        año = temp.año
        self.perform_destroy(temp)
        registrar_actividad(request.user, f"Eliminó temporada {año}")
        return self.notify(
            key="temporada_delete_success",
            data={"info": f"Temporada {año} eliminada."},
        )

    # --------------------------- ACCIONES PERSONALIZADAS ---------------------------
    @action(detail=True, methods=["post"], url_path="finalizar")
    def finalizar(self, request, pk=None):
        temp = self.get_object()
        if not temp.finalizada:
            temp.finalizar()
            registrar_actividad(request.user, f"Finalizó la temporada {temp.año}")
            key = "temporada_finalizada"
        else:
            temp.finalizada = False
            temp.fecha_fin  = None
            temp.save(update_fields=["finalizada", "fecha_fin"])
            registrar_actividad(request.user, f"Reactivó la temporada {temp.año}")
            key = "temporada_reactivada"

        return self.notify(key=key, data={"temporada": self.get_serializer(temp).data})

    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        temp = self.get_object()
        if not temp.is_active:
            return self.notify(
                key="temporada_ya_archivada",
                data={"info": "Esta temporada ya está archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        temp.archivar()
        registrar_actividad(request.user, f"Archivó la temporada {temp.año}")
        return self.notify(key="temporada_archivada", data={"temporada": self.get_serializer(temp).data})

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        temp = self.get_object()
        if temp.is_active:
            return self.notify(
                key="temporada_no_archivada",
                data={"info": "Esta temporada ya está activa."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        temp.desarchivar()
        registrar_actividad(request.user, f"Restauró la temporada {temp.año}")
        return self.notify(key="temporada_restaurada", data={"temporada": self.get_serializer(temp).data})
