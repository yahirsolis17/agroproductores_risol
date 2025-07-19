# src/modules/gestion_huerta/views/temporada_views.py
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Q
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from gestion_huerta.models       import Temporada, Huerta, HuertaRentada
from gestion_huerta.serializers  import TemporadaSerializer
from gestion_huerta.utils.notification_handler import NotificationHandler
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.utils.audit   import ViewSetAuditMixin                 # ⬅️ auditoría
from gestion_huerta.views.huerta_views import NotificationMixin
from agroproductores_risol.utils.pagination import TemporadaPagination
from gestion_huerta.permissions   import HasHuertaModulePermission, HuertaGranularPermission


class TemporadaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de temporadas + acciones custom (“finalizar / reactivar”, archivar, restaurar).
    Incluye auditoría automática (ViewSetAuditMixin) y respuestas uniformes (NotificationMixin).
    """
    queryset           = Temporada.objects.select_related("huerta", "huerta_rentada").order_by("-año")
    serializer_class   = TemporadaSerializer
    pagination_class   = TemporadaPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    # ------------------------------------------------------------------ QUERYSET DINÁMICO
    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        # Filtro por año
        if (year := params.get("año")):
            qs = qs.filter(año=year)

        # Filtro por huerta propia
        if (h_id := params.get("huerta")):
            qs = qs.filter(huerta_id=h_id)

        # Filtro por huerta rentada
        if (hr_id := params.get("huerta_rentada")):
            qs = qs.filter(huerta_rentada_id=hr_id)

        # Filtro por estado (activas, archivadas, todas)
        estado = params.get("estado", "activas")
        if estado == "activas":
            qs = qs.filter(is_active=True)
        elif estado == "archivadas":
            qs = qs.filter(is_active=False)
        # Si es "todas", no aplicamos filtro

        # Filtro por finalizada
        finalizada = params.get("finalizada")
        if finalizada is not None:
            if finalizada.lower() in ['true', '1']:
                qs = qs.filter(finalizada=True)
            elif finalizada.lower() in ['false', '0']:
                qs = qs.filter(finalizada=False)

        # Búsqueda general
        search = params.get("search")
        if search:
            qs = qs.filter(
                Q(año__icontains=search) |
                Q(huerta__nombre__icontains=search) |
                Q(huerta_rentada__nombre__icontains=search) |
                Q(huerta__propietario__nombre__icontains=search) |
                Q(huerta__propietario__apellidos__icontains=search) |
                Q(huerta_rentada__propietario__nombre__icontains=search) |
                Q(huerta_rentada__propietario__apellidos__icontains=search)
            )

        return qs

    # ------------------------------------------------------------------ LIST
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return self.notify(
            key="no_notification",
            data={"temporadas": serializer.data},
            status_code=status.HTTP_200_OK,
        )

    # ------------------------------------------------------------------ CREATE
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        for f in ("huerta", "huerta_rentada"):
            if f in data and data[f] in [None, "", "null", "None"]:
                data.pop(f)

        # Validaciones previas
        if "huerta" in data:
            try:
                h = Huerta.objects.get(pk=data["huerta"])
                if not h.is_active:
                    return self.notify(key="huerta_archivada_temporada",
                                       status_code=status.HTTP_400_BAD_REQUEST)
            except Huerta.DoesNotExist:
                return self.notify(key="validation_error",
                                   data={"errors": {"huerta": ["La huerta no existe."]}},
                                   status_code=status.HTTP_400_BAD_REQUEST)

        if "huerta_rentada" in data:
            try:
                hr = HuertaRentada.objects.get(pk=data["huerta_rentada"])
                if not hr.is_active:
                    return self.notify(key="huerta_rentada_archivada",
                                       status_code=status.HTTP_400_BAD_REQUEST)
            except HuertaRentada.DoesNotExist:
                return self.notify(key="validation_error",
                                   data={"errors": {"huerta_rentada": ["La huerta rentada no existe."]}},
                                   status_code=status.HTTP_400_BAD_REQUEST)

        # Serialización
        serializer = self.get_serializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="temporada_duplicada",
                               data={"errors": serializer.errors},
                               status_code=status.HTTP_400_BAD_REQUEST)

        # Guardar + auditar
        self.perform_create(serializer)

        return self.notify(
            key="temporada_create_success",
            data={"temporada": serializer.data},
            status_code=status.HTTP_201_CREATED,
        )

    # ------------------------------------------------------------------ UPDATE
    def update(self, request, *args, **kwargs):
        partial    = kwargs.pop("partial", False)
        instance   = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError:
            return self.notify(key="validation_error",
                               data={"errors": serializer.errors},
                               status_code=status.HTTP_400_BAD_REQUEST)

        self.perform_update(serializer)  # ⬅️ auditar cambios

        return self.notify(
            key="temporada_update_success",
            data={"temporada": serializer.data},
            status_code=status.HTTP_200_OK,
        )

    # ------------------------------------------------------------------ DELETE
    def destroy(self, request, *args, **kwargs):
        temp = self.get_object()
        if temp.cosechas.exists():
            return self.notify(key="temporada_con_dependencias",
                               data={"error": "No se puede eliminar. Tiene cosechas asociadas."},
                               status_code=status.HTTP_400_BAD_REQUEST)

        self.perform_destroy(temp)  # ⬅️ auditar borrado

        return self.notify(
            key="temporada_delete_success",
            data={"info": f"Temporada {temp.año} eliminada."},
            status_code=status.HTTP_200_OK,
        )

    # ------------------------------------------------------------------ ACCIONES PERSONALIZADAS
    @action(detail=True, methods=["post"], url_path="finalizar")
    def finalizar(self, request, pk=None):
        temp = self.get_object()
        if not temp.finalizada:
            temp.finalizar()
            registrar_actividad(request.user, f"Finalizó la temporada {temp.año}")
            key = "temporada_finalizada"
        else:
            temp.finalizada = False
            temp.fecha_fin = None
            temp.save(update_fields=["finalizada", "fecha_fin"])
            registrar_actividad(request.user, f"Reactivó la temporada {temp.año}")
            key = "temporada_reactivada"

        return self.notify(
            key=key,
            data={"temporada": self.get_serializer(temp).data},
        )

    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        temp = self.get_object()
        if not temp.is_active:
            return self.notify(key="temporada_ya_archivada",
                               data={"info": "Esta temporada ya está archivada."},
                               status_code=status.HTTP_400_BAD_REQUEST)

        temp.archivar()
        registrar_actividad(request.user, f"Archivó la temporada {temp.año}")

        return self.notify(
            key="temporada_archivada",
            data={"temporada": self.get_serializer(temp).data},
        )

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        temp = self.get_object()
        if temp.is_active:
            return self.notify(key="temporada_no_archivada",
                               data={"info": "Esta temporada ya está activa."},
                               status_code=status.HTTP_400_BAD_REQUEST)

        temp.desarchivar()
        registrar_actividad(request.user, f"Restauró la temporada {temp.año}")

        return self.notify(
            key="temporada_restaurada",
            data={"temporada": self.get_serializer(temp).data},
        )
