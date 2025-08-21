# ---------------------------------------------------------------------------
#  ████████╗███████╗███╗   ███╗██████╗  ██████╗ ██████╗  █████╗ ███╗   ██╗
#  ╚══██╔══╝██╔════╝████╗ ████║██╔══██╗██╔════╝ ██╔══██╗██╔══██╗████╗  ██║
#     ██║   █████╗  ██╔████╔██║██████╔╝██║  ███╗██████╔╝███████║██╔██╗ ██║
#     ██║   ██╔══╝  ██║╚██╔╝██║██╔══██╗██║   ██║██╔══██╗██╔══██║██║╚██╗██║
#     ██║   ███████╗██║ ╚═╝ ██║██║  ██║╚██████╔╝██║  ██║██║  ██║██║ ╚████║
#     ╚═╝   ╚══════╝╚═╝     ╚═╝╚═╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝
#
#  Vista de Temporadas (ModelViewSet) con permisos granulares y validaciones:
#  - Paginación uniforme
#  - XOR de origen (huerta vs huerta_rentada)
#  - Estados normalizados (activos/archivados)
#  - Cascada con conteos en archivar/restaurar
#  - 🔐 Permiso contextual en 'finalizar': finalize vs reactivate
# ---------------------------------------------------------------------------

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
from gestion_usuarios.permissions    import HasModulePermission


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _map_temporada_validation_errors(errors: dict) -> tuple[str, dict]:
    non_field  = errors.get('non_field_errors') or errors.get('__all__') or []
    año_err    = errors.get('año') or []
    huerta_err = errors.get('huerta') or []
    hr_err     = errors.get('huerta_rentada') or []

    to_texts   = lambda lst: [str(x) for x in (lst if isinstance(lst, (list, tuple)) else [lst])]
    all_texts  = to_texts(non_field) + to_texts(año_err) + to_texts(huerta_err) + to_texts(hr_err)

    for msg in all_texts:
        txt = msg.strip()
        if txt in ("Debe asignar una huerta o una huerta rentada.",
                   "Debe asignar una huerta propia o rentada."):
            return "temporada_sin_origen", {"errors": errors}
        if txt in ("No puede asignar ambas huertas al mismo tiempo.",
                   "No puede asignar ambas huertas a la vez."):
            return "temporada_con_dos_origenes", {"errors": errors}
        if txt == "El año debe estar entre 2000 y el año siguiente al actual.":
            return "validation_error", {"errors": errors}
        if txt in ("Ya existe una temporada para esta huerta en ese año.",
                   "Ya existe una temporada para esta huerta rentada en ese año."):
            return "temporada_duplicada", {"errors": errors}
        if txt == "No se puede crear/editar temporada en una huerta archivada.":
            return "huerta_archivada_temporada", {"errors": errors}
        if txt == "No se puede crear/editar temporada en una huerta rentada archivada.":
            return "huerta_rentada_archivada", {"errors": errors}

    return "temporada_campos_invalidos", {"errors": errors}



def _has_perm(user, codename: str) -> bool:
    """
    Admin pasa siempre. Si no, exige el codename 'gestion_huerta.<codename>'.
    """
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "role", None) == "admin":
        return True
    return user.has_perm(f"gestion_huerta.{codename}")


# ---------------------------------------------------------------------------
#  📅  TEMPORADAS
# ---------------------------------------------------------------------------
class TemporadaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    queryset = (
        Temporada.objects
        .select_related("huerta", "huerta_rentada", "huerta__propietario", "huerta_rentada__propietario")
        .order_by("-año", "-id")
    )
    serializer_class   = TemporadaSerializer
    pagination_class   = TemporadaPagination
    permission_classes = [IsAuthenticated, HasModulePermission]

    # Mapa base (CRUD + archivar/restaurar)
    _perm_map = {
        "list":           ["view_temporada"],
        "retrieve":       ["view_temporada"],
        "create":         ["add_temporada"],
        "update":         ["change_temporada"],
        "partial_update": ["change_temporada"],
        "destroy":        ["delete_temporada"],
        "archivar":       ["archive_temporada"],
        "restaurar":      ["restore_temporada"],
        # 'finalizar' se resuelve de forma CONTEXTUAL más abajo
    }

    def get_permissions(self):
        """
        Para 'finalizar' intentamos decidir el permiso necesario con el estado actual:
        - Si la temporada NO está finalizada → finalize_temporada
        - Si SÍ está finalizada          → reactivate_temporada
        Si no podemos resolver (p.ej. listar o 404), permitimos cualquiera de ambos para
        que el sistema llegue al handler y devuelva 404/403 donde toca. Luego se revalida
        dentro del método 'finalizar' antes de ejecutar.
        """
        if self.action == "finalizar":
            required = ["finalize_temporada", "reactivate_temporada"]
            pk = self.kwargs.get("pk")
            if pk:
                try:
                    # Cargar sólo lo necesario; evitar costos altos
                    finalizada = Temporada.objects.only("id", "finalizada").get(pk=pk).finalizada
                    required = ["reactivate_temporada"] if finalizada else ["finalize_temporada"]
                except Temporada.DoesNotExist:
                    # dejar ambos para no filtrar un 404 por permisos
                    pass
            self.required_permissions = required
        else:
            self.required_permissions = self._perm_map.get(self.action, ["view_temporada"])

        return [p() for p in self.permission_classes]

    # ----------------------------- Queryset base -----------------------------
    def get_queryset(self):
        # base con select_related profundo y orden estable
        qs = (
            Temporada.objects
            .select_related("huerta", "huerta_rentada", "huerta__propietario", "huerta_rentada__propietario")
            .order_by("-año", "-id")
        )
        params = self.request.query_params

        # Para acciones directas sobre un recurso, no aplicamos filtros de lista
        if self.action in ['archivar', 'restaurar', 'retrieve', 'destroy', 'finalizar', 'update', 'partial_update']:
            return qs

        # Filtro por año (acepta 'año' y alias 'anio')
        year = params.get("año") or params.get("anio")
        if year:
            qs = qs.filter(año=year)

        # Filtros por origen (huerta vs huerta_rentada)
        if (h_id := params.get("huerta")):
            qs = qs.filter(huerta_id=h_id)

        if (hr_id := params.get("huerta_rentada")):
            qs = qs.filter(huerta_rentada_id=hr_id)

        # Normalización de estado (acepta ambas variantes y "todos"/"all")
        estado_raw = (params.get("estado") or "activos").strip().lower()
        if estado_raw in ("activos", "activas"):
            qs = qs.filter(is_active=True)
        elif estado_raw in ("archivados", "archivadas"):
            qs = qs.filter(is_active=False)
        elif estado_raw in ("todos", "all"):
            pass  # sin filtro

        # Estado de finalización (en_curso/finalizadas o boolean finalizada=true/false)
        if (fin_estado := params.get("estado_finalizacion")):
            fin_estado = fin_estado.lower()
            if fin_estado == "en_curso":
                qs = qs.filter(finalizada=False)
            elif fin_estado == "finalizadas":
                qs = qs.filter(finalizada=True)

        finalizada = params.get("finalizada")
        if finalizada is not None:
            low = str(finalizada).lower()
            if low in ('true', '1'):
                qs = qs.filter(finalizada=True)
            elif low in ('false', '0'):
                qs = qs.filter(finalizada=False)

        # Búsqueda rica (año como texto + nombres de huertas/propietarios)
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

    # -------------------------------- LIST ----------------------------------
    def list(self, request, *args, **kwargs):
        # Rechazo explícito si la consulta viene con ambos padres (ambiguo)
        params = request.query_params
        has_h  = bool(params.get("huerta"))
        has_hr = bool(params.get("huerta_rentada"))
        if has_h and has_hr:
            return self.notify(
                key="temporada_origen_exclusivo",
                data={"errors": {"non_field_errors": ["No puede usar huerta y huerta_rentada a la vez."]}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        page = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        ser  = self.get_serializer(page, many=True)

        # Contrato de paginación uniforme (idéntico a Huertas)
        return self.notify(
            key="data_processed_success",
            data={
                "temporadas": ser.data,
                "meta": {
                    "count": self.paginator.page.paginator.count,
                    "next":  self.paginator.get_next_link(),
                    "previous": self.paginator.get_previous_link(),
                    "page": self.paginator.page.number,
                    "page_size": self.paginator.get_page_size(request),
                    "total_pages": self.paginator.page.paginator.num_pages,
                }
            },
            status_code=status.HTTP_200_OK
        )

    # ------------------------------- CREATE ---------------------------------
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        # saneamiento de campos "vacíos"
        for f in ("huerta", "huerta_rentada"):
            if f in data and f in data and data[f] in [None, "", "null", "None"]:
                data.pop(f)

        ser = self.get_serializer(data=data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload = _map_temporada_validation_errors(getattr(ex, 'detail', ser.errors))
            return self.notify(key=key, data=payload, status_code=status.HTTP_400_BAD_REQUEST)

        self.perform_create(ser)
        return self.notify(
            key="temporada_create_success",
            data={"temporada": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    # ------------------------------- UPDATE ---------------------------------
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
        return self.notify(key="temporada_update_success", data={"temporada": ser.data})

    # ------------------------------- DELETE ---------------------------------
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
        return self.notify(key="temporada_delete_success", data={"info": f"Temporada {año} eliminada."})

    # ----------------------------- FINALIZAR (toggle) -----------------------
    @action(detail=True, methods=["post"], url_path="finalizar")
    def finalizar(self, request, pk=None):
        temp = self.get_object()

        required = "finalize_temporada" if not temp.finalizada else "reactivate_temporada"
        if not _has_perm(request.user, required):
            info = "finalizar" if required == "finalize_temporada" else "reactivar"
            return self.notify(
                key="permission_denied",
                data={"info": f"No tienes permiso para {info} temporadas."},
                status_code=status.HTTP_403_FORBIDDEN,
            )

        if not temp.is_active:
            return self.notify(
                key="temporada_archivada_no_finalizar",
                data={"info": "No puedes finalizar/reactivar una temporada archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if not temp.finalizada:
            temp.finalizar()
            origen = temp.huerta or temp.huerta_rentada
            registrar_actividad(request.user, f"Finalizó la temporada {temp.año} de {origen}")
            key = "temporada_finalizada"
        else:
            temp.finalizada = False
            temp.fecha_fin  = None
            temp.save(update_fields=["finalizada", "fecha_fin"])
            origen = temp.huerta or temp.huerta_rentada
            registrar_actividad(request.user, f"Reactivó la temporada {temp.año} de {origen}")
            key = "temporada_reactivada"

        return self.notify(key=key, data={"temporada": self.get_serializer(temp).data})

    # ------------------------------ ARCHIVAR --------------------------------
    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        if not _has_perm(request.user, "archive_temporada"):
            return self.notify(
                key="permission_denied",
                data={"info": "No tienes permiso para archivar temporadas."},
                status_code=status.HTTP_403_FORBIDDEN,
            )
        temp = self.get_object()
        if not temp.is_active:
            return self.notify(
                key="temporada_ya_archivada",
                data={"info": "Esta temporada ya está archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        try:
            with transaction.atomic():
                affected = temp.archivar()   # ← devolvemos conteos de cascada
        except Exception:
            return self.notify(
                key="operacion_atomica_fallida",
                data={"info": "No se pudo completar la operación."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        origen = temp.huerta or temp.huerta_rentada
        registrar_actividad(request.user, f"Archivó la temporada {temp.año} de {origen}")
        return self.notify(
            key="temporada_archivada",
            data={"temporada": self.get_serializer(temp).data, "affected": affected}
        )

    # ----------------------------- RESTAURAR --------------------------------
    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        if not _has_perm(request.user, "restore_temporada"):
            return self.notify(
                key="permission_denied",
                data={"info": "No tienes permiso para restaurar temporadas."},
                status_code=status.HTTP_403_FORBIDDEN,
            )
        temp = self.get_object()
        if temp.is_active:
            return self.notify(
                key="temporada_no_archivada",
                data={"info": "Esta temporada ya está activa."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Validar que el origen no esté archivado
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
                affected = temp.desarchivar()  # ← devolvemos conteos de cascada
        except Exception:
            return self.notify(
                key="operacion_atomica_fallida",
                data={"info": "No se pudo completar la operación."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        origen = temp.huerta or temp.huerta_rentada
        registrar_actividad(request.user, f"Restauró la temporada {temp.año} de {origen}")
        return self.notify(
            key="temporada_restaurada",
            data={"temporada": self.get_serializer(temp).data, "affected": affected}
        )
