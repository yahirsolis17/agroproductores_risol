from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Q, CharField
from django.db.models.functions import Cast
from django.db import transaction
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from gestion_huerta.models        import Temporada, Huerta, HuertaRentada
from gestion_huerta.serializers   import TemporadaSerializer
from gestion_huerta.utils.notification_handler import NotificationHandler
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.utils.audit    import ViewSetAuditMixin
from gestion_huerta.views.huerta_views import NotificationMixin
from agroproductores_risol.utils.pagination import TemporadaPagination
from gestion_huerta.permissions    import HasHuertaModulePermission, HuertaGranularPermission


def _map_temporada_validation_errors(errors: dict) -> tuple[str, dict]:
    non_field = errors.get('non_field_errors') or errors.get('__all__') or []
    año_err   = errors.get('año') or []
    huerta_err = errors.get('huerta') or []
    hr_err     = errors.get('huerta_rentada') or []

    to_texts = lambda lst: [str(x) for x in (lst if isinstance(lst, (list, tuple)) else [lst])]
    all_texts = to_texts(non_field) + to_texts(año_err) + to_texts(huerta_err) + to_texts(hr_err)

    for msg in all_texts:
        txt = msg.strip()
        if txt == "Debe asignar una huerta o una huerta rentada.":
            return "temporada_origen_requerido", {"errors": errors}
        if txt == "No puede asignar ambas huertas al mismo tiempo.":
            return "temporada_origen_exclusivo", {"errors": errors}
        if txt == "El año debe estar entre 2000 y el año siguiente al actual.":
            return "temporada_año_fuera_de_rango", {"errors": errors}
        if txt in ("Ya existe una temporada para esta huerta en ese año.",
                   "Ya existe una temporada para esta huerta rentada en ese año."):
            return "temporada_duplicada", {"errors": errors}
        if txt == "No se puede crear/editar temporada en una huerta archivada.":
            return "temporada_huerta_archivada", {"errors": errors}
        if txt == "No se puede crear/editar temporada en una huerta rentada archivada.":
            return "temporada_huerta_rentada_archivada", {"errors": errors}

    return "temporada_campos_invalidos", {"errors": errors}


class TemporadaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    queryset = (
        Temporada.objects
        .select_related("huerta", "huerta_rentada", "huerta__propietario", "huerta_rentada__propietario")
        .order_by("-año", "-id")  # <- orden estable (tiebreaker)
    )
    serializer_class   = TemporadaSerializer
    pagination_class   = TemporadaPagination
    permission_classes = [IsAuthenticated, HasHuertaModulePermission, HuertaGranularPermission]

    def get_queryset(self):
        # base con select_related profundo y orden estable
        qs = (
            Temporada.objects
            .select_related("huerta", "huerta_rentada", "huerta__propietario", "huerta_rentada__propietario")
            .order_by("-año", "-id")
        )
        params = self.request.query_params

        if self.action in ['archivar', 'restaurar', 'retrieve', 'destroy', 'finalizar', 'update', 'partial_update']:
            return qs

        # Filtro por año (acepta 'año' y alias 'anio')
        year = params.get("año") or params.get("anio")
        if year:
            qs = qs.filter(año=year)

        if (h_id := params.get("huerta")):
            qs = qs.filter(huerta_id=h_id)

        if (hr_id := params.get("huerta_rentada")):
            qs = qs.filter(huerta_rentada_id=hr_id)

        estado = (params.get("estado") or "activas").lower()
        if estado == "activas":
            qs = qs.filter(is_active=True)
        elif estado == "archivadas":
            qs = qs.filter(is_active=False)

        if (fin_estado := params.get("estado_finalizacion")):
            fin_estado = fin_estado.lower()
            if fin_estado == "en_curso":
                qs = qs.filter(finalizada=False)
            elif fin_estado == "finalizadas":
                qs = qs.filter(finalizada=True)

        finalizada = params.get("finalizada")
        if finalizada is not None:
            low = finalizada.lower()
            if low in ('true', '1'):
                qs = qs.filter(finalizada=True)
            elif low in ('false', '0'):
                qs = qs.filter(finalizada=False)

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

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        ser  = self.get_serializer(page, many=True)

        # meta extendida (no rompe front; suma claridad)
        paginator = getattr(self, "paginator", None)
        page_number = getattr(getattr(paginator, "page", None), "number", None)
        page_size = None
        try:
            page_size = paginator.get_page_size(request)  # si tu pagination lo soporta
        except Exception:
            page_size = len(ser.data)
        total_pages = getattr(getattr(paginator, "page", None), "paginator", None)
        total_pages = getattr(total_pages, "num_pages", None)

        return self.notify(
            key="data_processed_success",
            data={
                "temporadas": ser.data,
                "meta": {
                    "count": self.paginator.page.paginator.count,
                    "next":  self.paginator.get_next_link(),
                    "previous": self.paginator.get_previous_link(),
                    "page": page_number,
                    "page_size": page_size,
                    "total_pages": total_pages,
                }
            },
            status_code=status.HTTP_200_OK
        )

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        for f in ("huerta", "huerta_rentada"):
            if f in data and data[f] in [None, "", "null", "None"]:
                data.pop(f)

        ser = self.get_serializer(data=data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload = _map_temporada_validation_errors(getattr(ex, 'detail', ser.errors))
            return self.notify(key=key, data=payload, status_code=status.HTTP_400_BAD_REQUEST)

        self.perform_create(ser)
        registrar_actividad(request.user, f"Creó temporada {ser.data.get('año')}")
        return self.notify(
            key="temporada_create_success",
            data={"temporada": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial  = kwargs.pop("partial", False)
        instance = self.get_object()

        if not instance.is_active:
            return self.notify(
                key="temporada_archivada_no_editar",
                data={"info": "No puedes editar una temporada archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if instance.finalizada:
            return self.notify(
                key="temporada_finalizada_no_editar",
                data={"info": "No puedes editar una temporada finalizada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        ser = self.get_serializer(instance, data=request.data, partial=partial)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload = _map_temporada_validation_errors(getattr(ex, 'detail', ser.errors))
            return self.notify(key=key, data=payload, status_code=status.HTTP_400_BAD_REQUEST)

        self.perform_update(ser)
        registrar_actividad(request.user, f"Actualizó temporada {ser.data.get('año')}")
        return self.notify(key="temporada_update_success", data={"temporada": ser.data})

    def destroy(self, request, *args, **kwargs):
        temp = self.get_object()
        if temp.is_active:
            return self.notify(
                key="temporada_debe_estar_archivada",
                data={"error": "Debes archivar la temporada antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if temp.cosechas.exists():
            return self.notify(
                key="temporada_con_dependencias",
                data={"error": "No se puede eliminar. Tiene cosechas asociadas."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        año = temp.año
        self.perform_destroy(temp)
        registrar_actividad(request.user, f"Eliminó temporada {año}")
        return self.notify(key="temporada_delete_success", data={"info": f"Temporada {año} eliminada."})

    @action(detail=True, methods=["post"], url_path="finalizar")
    def finalizar(self, request, pk=None):
        temp = self.get_object()
        if not temp.is_active:
            return self.notify(
                key="temporada_archivada_no_finalizar",
                data={"info": "No puedes finalizar/reactivar una temporada archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
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
        try:
            with transaction.atomic():
                temp.archivar()
        except Exception:
            return self.notify(
                key="operacion_atomica_fallida",
                data={"info": "No se pudo completar la operación."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

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

        if temp.huerta_id and not temp.huerta.is_active:
            return self.notify(
                key="temporada_origen_archivado_no_restaurar",
                data={"info": "No puedes restaurar una temporada cuya huerta está archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if temp.huerta_rentada_id and not temp.huerta_rentada.is_active:
            return self.notify(
                key="temporada_origen_archivado_no_restaurar",
                data={"info": "No puedes restaurar una temporada cuya huerta rentada está archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                temp.desarchivar()
        except Exception:
            return self.notify(
                key="operacion_atomica_fallida",
                data={"info": "No se pudo completar la operación."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        registrar_actividad(request.user, f"Restauró la temporada {temp.año}")
        return self.notify(key="temporada_restaurada", data={"temporada": self.get_serializer(temp).data})
