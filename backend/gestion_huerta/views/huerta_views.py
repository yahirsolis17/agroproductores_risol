# gestion_huerta/views/viewsets.py
# ---------------------------------------------------------------------------
#  ██████╗ ██╗   ██╗██████╗ ███████╗████████╗ █████╗     ██████╗ ██╗   ██╗
#  ██╔══██╗██║   ██║██╔══██╗██╔════╝╚══██╔══╝██╔══██╗    ██╔══██╗██║   ██║
#  ██████╔╝██║   ██║██║  ██║█████╗     ██║   ███████║    ██████╔╝██║   ██║
#  ██╔══██╗██║   ██║██║  ██║██╔══╝     ██║   ██╔══██║    ██╔══██╗██║   ██║
#  ██████╔╝╚██████╔╝██████╔╝███████╗   ██║   ██║  ██║    ██████╔╝╚██████╔╝
#  ╚═════╝  ╚═════╝ ╚═════╝ ╚══════╝   ╚═╝   ╚═╝  ╚═╝    ╚═════╝  ╚═════╝
#
#  Vista unificada (ModelViewSet) para todo el módulo de huertas.
#  Cada método devuelve el mismo JSON que ya usa tu frontend
#  (NotificationHandler.generate_response), por lo que NO tendrás
#  que cambiar nada en React/Redux.
# ---------------------------------------------------------------------------

import logging
import ast
from django.utils import timezone
from rest_framework import status, viewsets, serializers
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from rest_framework import filters
from django.db import transaction, IntegrityError

# Modelos
from gestion_huerta.models import Propietario, Huerta, HuertaRentada

# Serializadores
from gestion_huerta.serializers import (
    PropietarioSerializer,
    HuertaSerializer,
    HuertaRentadaSerializer,
)

# Permisos
from gestion_huerta.permissions import (
    HasHuertaModulePermission,
    HuertaGranularPermission,
)

# Utilidades
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.utils.notification_handler import NotificationHandler
from gestion_huerta.utils.audit import ViewSetAuditMixin
from agroproductores_risol.utils.pagination import GenericPagination

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Mix-in que centraliza las respuestas uniformes
# ---------------------------------------------------------------------------
class NotificationMixin:
    """Shortcut para devolver respuestas con el formato del frontend."""
    def notify(self, *, key: str, data=None, status_code=status.HTTP_200_OK):
        return NotificationHandler.generate_response(
            message_key=key,
            data=data or {},
            status_code=status_code,
        )


# ---------------------------------------------------------------------------
#  Helpers de mapeo de errores → keys
# ---------------------------------------------------------------------------
def _msg_in(errors_dict, text_substring: str) -> bool:
    """Busca un substring en cualquier mensaje de error del dict DRF."""
    for _, msgs in (errors_dict or {}).items():
        if isinstance(msgs, (list, tuple)):
            for m in msgs:
                if text_substring.lower() in str(m).lower():
                    return True
        elif isinstance(msgs, str) and text_substring.lower() in msgs.lower():
            return True
    return False


# ---------------------------------------------------------------------------
#  🏠  PROPIETARIOS
# ---------------------------------------------------------------------------
class PropietarioViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    queryset = Propietario.objects.all().order_by('-id')
    serializer_class = PropietarioSerializer
    pagination_class = GenericPagination
    # 🔥 QUITAMOS SearchFilter para evitar doble search:
    # filter_backends = [filters.SearchFilter]
    # search_fields = ['nombre', 'apellidos', 'telefono']

    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    # ---------- LIST ----------
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        # Exact match por nombre (prioridad visual)
        search_param = request.query_params.get("search", "").strip()
        exact_match = None
        if search_param:
            exact_match = self.get_queryset().filter(nombre=search_param).first()
            if exact_match:
                queryset = queryset.exclude(id=exact_match.id)

        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)

        results = serializer.data
        if exact_match:
            exact_data = self.get_serializer(exact_match).data
            results = [exact_data] + results

        return self.notify(
            key="data_processed_success",
            data={
                "propietarios": results,
                "meta": {
                    "count": self.paginator.page.paginator.count,
                    "next": self.paginator.get_next_link(),
                    "previous": self.paginator.get_previous_link(),
                }
            }
        )

    # ---------- CREATE ----------
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError as e:
            errors = serializer.errors or getattr(e, "detail", {}) or {}
            # Mapeo más específico
            if 'telefono' in errors and _msg_in(errors, "registrado"):
                key = "propietario_telefono_duplicado"
            elif any(k in errors for k in ("nombre", "apellidos", "direccion")):
                key = "propietario_campos_invalidos"
            else:
                key = "validation_error"
            return self.notify(key=key, data={"errors": errors}, status_code=status.HTTP_400_BAD_REQUEST)

        self.perform_create(serializer)
        return self.notify(
            key="propietario_create_success",
            data={"propietario": serializer.data},
            status_code=status.HTTP_201_CREATED,
        )

    # ---------- UPDATE ----------
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError as e:
            errors = serializer.errors or getattr(e, "detail", {}) or {}
            if 'telefono' in errors and _msg_in(errors, "registrado"):
                key = "propietario_telefono_duplicado"
            elif any(k in errors for k in ("nombre", "apellidos", "direccion")):
                key = "propietario_campos_invalidos"
            else:
                key = "validation_error"
            return self.notify(key=key, data={"errors": errors}, status_code=status.HTTP_400_BAD_REQUEST)

        self.perform_update(serializer)
        return self.notify(
            key="propietario_update_success",
            data={"propietario": serializer.data}
        )

    # ---------- DELETE ----------
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.huertas.exists() or instance.huertas_rentadas.exists():
            return self.notify(
                key="propietario_con_dependencias",
                data={"info": "No se puede eliminar un propietario con huertas registradas."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_destroy(instance)
        return self.notify(
            key="propietario_delete_success",
            data={"info": "Propietario eliminado."}
        )

    # ---------- ARCHIVAR ----------
    @action(detail=True, methods=["patch"], url_path="archivar")
    def archivar(self, request, pk=None):
        propietario = self.get_object()
        if propietario.archivado_en:
            return self.notify(
                key="propietario_ya_archivado",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        propietario.archivar()
        registrar_actividad(request.user, f"Archivó al propietario: {propietario.nombre}")
        return self.notify(
            key="propietario_archivado",
            data={"propietario": self.get_serializer(propietario).data},
        )

    # ---------- RESTAURAR ----------
    @action(detail=True, methods=["patch"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        propietario = self.get_object()
        if propietario.is_active:
            return self.notify(
                key="propietario_no_archivado",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        propietario.desarchivar()
        registrar_actividad(request.user, f"Restauró al propietario: {propietario.nombre}")
        return self.notify(
            key="propietario_restaurado",
            data={"propietario": self.get_serializer(propietario).data},
        )

    @action(detail=False, methods=["get"], url_path="solo-con-huertas")
    def solo_con_huertas(self, request):
        qs = self.get_queryset().filter(
            Q(huertas__isnull=False) |
            Q(huertas_rentadas__isnull=False)
        ).distinct()

        search = request.query_params.get("search", "").strip()
        exact_match = None

        if search:
            qs = qs.filter(
                Q(nombre__icontains=search) |
                Q(apellidos__icontains=search)
            )
            self.pagination_class.page_size = 50

            exact_match = self.get_queryset().filter(
                Q(huertas__isnull=False) |
                Q(huertas_rentadas__isnull=False),
                nombre=search
            ).distinct().first()

            if exact_match:
                qs = qs.exclude(id=exact_match.id)

        qs = qs.order_by('-id')

        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page, many=True)
        results = serializer.data

        if exact_match:
            results = [self.get_serializer(exact_match).data] + results

        return self.notify(
            key="data_processed_success",
            data={
                "propietarios": results,
                "meta": {
                    "count": self.paginator.page.paginator.count,
                    "next": self.paginator.get_next_link(),
                    "previous": self.paginator.get_previous_link(),
                }
            }
        )

    def get_queryset(self):
        qs = super().get_queryset().order_by('-id')
        params = self.request.query_params

        # estado/archivado
        if archivado_param := params.get("archivado"):
            low = archivado_param.lower()
            if low in ["activos", "false"]:
                qs = qs.filter(archivado_en__isnull=True)
            elif low in ["archivados", "true"]:
                qs = qs.filter(archivado_en__isnull=False)

        # filtros exactos
        if id_param := params.get("id"):
            try:
                return qs.filter(id=int(id_param))
            except ValueError:
                pass
        if nombre := params.get("nombre"):
            return qs.filter(nombre=nombre)

        # 🔎 búsqueda rica (nombre, apellidos, nombre completo, teléfono, dirección)
        if search := params.get("search"):
            from django.db.models import Value, CharField
            from django.db.models.functions import Concat
            self.pagination_class.page_size = 10
            return qs.annotate(
                nombre_completo=Concat('nombre', Value(' '), 'apellidos', output_field=CharField())
            ).filter(
                Q(nombre__icontains=search) |
                Q(apellidos__icontains=search) |
                Q(nombre_completo__icontains=search) |
                Q(telefono__icontains=search) |
                Q(direccion__icontains=search)
            )

        return qs

    @action(detail=False, methods=["get"], url_path="buscar")
    def buscar_por_id(self, request):
        id_param = request.query_params.get("id")
        if not id_param:
            return self.notify(
                key="validation_error",
                data={"info": "Falta el parámetro 'id'."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        try:
            propietario = Propietario.objects.get(id=id_param)
        except Propietario.DoesNotExist:
            return self.notify(
                key="not_found",
                data={"info": "Propietario no encontrado."},
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return self.notify(
            key="data_processed_success",
            data={"propietario": self.get_serializer(propietario).data}
        )

# =========================
#   🌳 HUERTAS (PROPIAS)
# =========================
class HuertaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    serializer_class = HuertaSerializer
    queryset = Huerta.objects.all().order_by('-id')
    pagination_class = GenericPagination
    permission_classes = [
        IsAuthenticated,
        # HasHuertaModulePermission,
        # HuertaGranularPermission,
    ]

    # ---------- LIST ----------
    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        ser = self.get_serializer(page, many=True)

        payload = {
            "meta": {
                "count": self.paginator.page.paginator.count,
                "next": self.paginator.get_next_link(),
                "previous": self.paginator.get_previous_link(),
            },
            "results": ser.data,
            # Alias temporal de compatibilidad con UI existente:
            "huertas": ser.data,
        }
        return self.notify(key="data_processed_success", data=payload, status_code=status.HTTP_200_OK)

    # ---------- CREATE ----------
    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as e:
            errors = ser.errors or getattr(e, "detail", {}) or {}
            if _msg_in(errors, "propietario archivado"):
                key = "huerta_propietario_archivado"
            elif any(k in errors for k in ("nombre", "ubicacion", "variedades", "hectareas")):
                key = "huerta_campos_invalidos"
            else:
                key = "validation_error"
            return self.notify(key=key, data={"errors": errors}, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            self.perform_create(ser)
        except IntegrityError:
            # unique_together: (nombre, ubicacion, propietario) activo
            return self.notify(
                key="huerta_duplicada",
                data={"info": "Ya existe una huerta activa con ese nombre y ubicación para el mismo propietario."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        return self.notify(key="huerta_create_success", data={"huerta": ser.data}, status_code=status.HTTP_201_CREATED)

    # ---------- UPDATE ----------
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        ser = self.get_serializer(instance, data=request.data, partial=partial)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as e:
            errors = ser.errors or getattr(e, "detail", {}) or {}
            if _msg_in(errors, "propietario archivado"):
                key = "huerta_propietario_archivado"
            elif any(k in errors for k in ("nombre", "ubicacion", "variedades", "hectareas")):
                key = "huerta_campos_invalidos"
            else:
                key = "validation_error"
            return self.notify(key=key, data={"errors": errors}, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            self.perform_update(ser)
        except IntegrityError:
            return self.notify(
                key="huerta_duplicada",
                data={"info": "Ya existe una huerta activa con ese nombre y ubicación para el mismo propietario."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        return self.notify(key="huerta_update_success", data={"huerta": ser.data})

    # ---------- DELETE ----------
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_active:
            return self.notify(key="huerta_debe_estar_archivada",
                               data={"error": "Debes archivar la huerta antes de eliminarla."},
                               status_code=status.HTTP_400_BAD_REQUEST)
        # Dependencias duras
        if hasattr(instance, 'temporadas') and instance.temporadas.exists():
            return self.notify(key="huerta_con_dependencias",
                               data={"error": "No se puede eliminar. Tiene temporadas registradas."},
                               status_code=status.HTTP_400_BAD_REQUEST)
        self.perform_destroy(instance)
        return self.notify(key="huerta_delete_success", data={"info": "Huerta eliminada."})

    # ---------- CUSTOM ACTIONS ----------
    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        instance = self.get_object()
        if not instance.is_active:
            return self.notify(key="ya_esta_archivada", status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            counts = instance.archivar()
            registrar_actividad(request.user, f"Archivó la huerta: {instance.nombre}")

        return self.notify(
            key="huerta_archivada",
            data={"huerta_id": instance.id, "affected": counts}
        )

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        instance = self.get_object()
        if instance.is_active:
            return self.notify(key="ya_esta_activa", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                counts = instance.desarchivar()
                registrar_actividad(request.user, f"Restauró la huerta: {instance.nombre}")
        except ValueError as e:
            # Conflicto de unicidad u otra política de negocio
            code = str(e)
            if code == "conflicto_unicidad_al_restaurar":
                return self.notify(
                    key="conflicto_unicidad_al_restaurar",
                    data={"info": "Existe un registro activo que impediría restaurar esta huerta."},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            return self.notify(
                key="operacion_atomica_fallida",
                data={"info": "No se pudo restaurar por una regla de negocio."},
                status_code=status.HTTP_400_BAD_REQUEST
            )

        return self.notify(
            key="huerta_restaurada",
            data={"huerta_id": instance.id, "affected": counts}
        )

    def get_queryset(self):
        qs = Huerta.objects.select_related("propietario").order_by('-id')
        params = self.request.query_params

        if estado := params.get("estado"):
            if estado == 'activos':
                qs = qs.filter(archivado_en__isnull=True)
            elif estado == 'archivados':
                qs = qs.filter(archivado_en__isnull=False)
        elif arch := params.get("archivado"):
            low = arch.lower()
            if low == "true":
                qs = qs.filter(archivado_en__isnull=False)
            elif low == "false":
                qs = qs.filter(archivado_en__isnull=True)

        if search := params.get("search"):
            qs = qs.filter(
                Q(nombre__icontains=search) |
                Q(ubicacion__icontains=search) |
                Q(variedades__icontains=search)
            )

        if prop := params.get("propietario"):
            qs = qs.filter(propietario_id=prop)
        if nombre := params.get("nombre"):
            qs = qs.filter(nombre__icontains=nombre)
        return qs


# ==============================
#   🏡 HUERTAS (RENTADAS)
# ==============================
class HuertaRentadaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    serializer_class = HuertaRentadaSerializer
    queryset = HuertaRentada.objects.all().order_by('-id')
    pagination_class = GenericPagination
    permission_classes = [
        IsAuthenticated,
        # HasHuertaModulePermission,
        # HuertaGranularPermission,
    ]

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        ser = self.get_serializer(page, many=True)

        payload = {
            "meta": {
                "count": self.paginator.page.paginator.count,
                "next": self.paginator.get_next_link(),
                "previous": self.paginator.get_previous_link(),
            },
            "results": ser.data,
            "huertas_rentadas": ser.data,  # alias compat
        }
        return self.notify(key="data_processed_success", data=payload, status_code=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as e:
            errors = ser.errors or getattr(e, "detail", {}) or {}
            if _msg_in(errors, "propietario archivado"):
                key = "huerta_rentada_propietario_archivado"
            elif 'monto_renta' in errors:
                key = "huerta_rentada_monto_invalido"
            elif any(k in errors for k in ("nombre", "ubicacion", "variedades", "hectareas")):
                key = "huerta_rentada_campos_invalidos"
            else:
                key = "validation_error"
            return self.notify(key=key, data={"errors": errors}, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            self.perform_create(ser)
        except IntegrityError:
            return self.notify(
                key="huerta_rentada_duplicada",
                data={"info": "Ya existe una huerta rentada activa con ese nombre y ubicación para el mismo propietario."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        return self.notify(key="huerta_rentada_create_success", data={"huerta_rentada": ser.data}, status_code=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        ser = self.get_serializer(instance, data=request.data, partial=partial)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as e:
            errors = ser.errors or getattr(e, "detail", {}) or {}
            if _msg_in(errors, "propietario archivado"):
                key = "huerta_rentada_propietario_archivado"
            elif 'monto_renta' in errors:
                key = "huerta_rentada_monto_invalido"
            elif any(k in errors for k in ("nombre", "ubicacion", "variedades", "hectareas")):
                key = "huerta_rentada_campos_invalidos"
            else:
                key = "validation_error"
            return self.notify(key=key, data={"errors": errors}, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            self.perform_update(ser)
        except IntegrityError:
            return self.notify(
                key="huerta_rentada_duplicada",
                data={"info": "Ya existe una huerta rentada activa con ese nombre y ubicación para el mismo propietario."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        return self.notify(key="huerta_rentada_update_success", data={"huerta_rentada": ser.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_active:
            return self.notify(key="huerta_debe_estar_archivada",
                               data={"error": "Debes archivar la huerta antes de eliminarla."},
                               status_code=status.HTTP_400_BAD_REQUEST)
        if hasattr(instance, 'temporadas') and instance.temporadas.exists():
            return self.notify(key="huerta_con_dependencias",
                               data={"error": "No se puede eliminar. Tiene temporadas registradas."},
                               status_code=status.HTTP_400_BAD_REQUEST)
        self.perform_destroy(instance)
        return self.notify(key="huerta_rentada_delete_success", data={"info": "Huerta rentada eliminada."})

    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        instance = self.get_object()
        if not instance.is_active:
            return self.notify(key="ya_esta_archivada", status_code=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            counts = instance.archivar()
            registrar_actividad(request.user, f"Archivó la huerta rentada: {instance.nombre}")

        return self.notify(key="huerta_archivada", data={"huerta_rentada_id": instance.id, "affected": counts})

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        instance = self.get_object()
        if instance.is_active:
            return self.notify(key="ya_esta_activa", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                counts = instance.desarchivar()
                registrar_actividad(request.user, f"Restauró la huerta rentada: {instance.nombre}")
        except ValueError as e:
            code = str(e)
            if code == "conflicto_unicidad_al_restaurar":
                return self.notify(
                    key="conflicto_unicidad_al_restaurar",
                    data={"info": "Existe un registro activo que impediría restaurar esta huerta rentada."},
                    status_code=status.HTTP_400_BAD_REQUEST
                )
            return self.notify(
                key="operacion_atomica_fallida",
                data={"info": "No se pudo restaurar por una regla de negocio."},
                status_code=status.HTTP_400_BAD_REQUEST
            )

        return self.notify(key="huerta_restaurada", data={"huerta_rentada_id": instance.id, "affected": counts})

    def get_queryset(self):
        qs = HuertaRentada.objects.select_related("propietario").order_by('-id')
        params = self.request.query_params

        if estado := params.get("estado"):
            if estado == 'activos':
                qs = qs.filter(archivado_en__isnull=True)
            elif estado == 'archivados':
                qs = qs.filter(archivado_en__isnull=False)
        elif arch := params.get("archivado"):
            low = arch.lower()
            if low == "true":
                qs = qs.filter(archivado_en__isnull=False)
            elif low == "false":
                qs = qs.filter(archivado_en__isnull=True)

        if search := params.get("search"):
            qs = qs.filter(
                Q(nombre__icontains=search) |
                Q(ubicacion__icontains=search) |
                Q(variedades__icontains=search)
            )

        if prop := params.get("propietario"):
            qs = qs.filter(propietario_id=prop)
        if nombre := params.get("nombre"):
            qs = qs.filter(nombre__icontains=nombre)
        return qs


# ==========================================================
#   🔀 HUERTAS COMBINADAS (Propias + Rentadas) exact-first
# ==========================================================
class HuertasCombinadasViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.GenericViewSet):
    pagination_class = GenericPagination
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="combinadas")
    def listar_combinadas(self, request):
        params      = request.query_params
        estado      = (params.get("estado") or "").strip().lower()
        tipo        = (params.get("tipo") or "").strip().lower()    # "", "propia", "rentada"
        nombre      = params.get("nombre")
        propietario = params.get("propietario")

        qs_p = Huerta.objects.select_related('propietario').all().order_by('-id')
        qs_r = HuertaRentada.objects.select_related('propietario').all().order_by('-id')

        if estado in ("activos", "false"):
            qs_p = qs_p.filter(archivado_en__isnull=True)
            qs_r = qs_r.filter(archivado_en__isnull=True)
        elif estado in ("archivados", "true"):
            qs_p = qs_p.filter(archivado_en__isnull=False)
            qs_r = qs_r.filter(archivado_en__isnull=False)

        if propietario:
            qs_p = qs_p.filter(propietario_id=propietario)
            qs_r = qs_r.filter(propietario_id=propietario)

        exact = []
        if nombre:
            ex_p = qs_p.filter(nombre=nombre).values_list('id', flat=True).first()
            ex_r = qs_r.filter(nombre=nombre).values_list('id', flat=True).first()
            if ex_p: exact.append(('propia', ex_p))
            if ex_r: exact.append(('rentada', ex_r))
            qs_p = qs_p.exclude(id__in=[i for t,i in exact if t=='propia']).filter(nombre__icontains=nombre)
            qs_r = qs_r.exclude(id__in=[i for t,i in exact if t=='rentada']).filter(nombre__icontains=nombre)

        combined = []
        if tipo in ("", "propia"):
            combined.extend([('propia', pk) for pk in qs_p.values_list('id', flat=True)])
        if tipo in ("", "rentada"):
            combined.extend([('rentada', pk) for pk in qs_r.values_list('id', flat=True)])

        ordered = exact + combined

        paginator = self.pagination_class()
        page_ids = paginator.paginate_queryset(ordered, request)

        page_data = []
        for t, pk in page_ids:
            if t == 'propia':
                obj = Huerta.objects.get(pk=pk)
                d = HuertaSerializer(obj).data
                d['tipo'] = 'propia'
            else:
                obj = HuertaRentada.objects.get(pk=pk)
                d = HuertaRentadaSerializer(obj).data
                d['tipo'] = 'rentada'
            page_data.append(d)

        return self.notify(
            key="data_processed_success",
            data={
                "meta": {
                    "count": paginator.page.paginator.count,
                    "next": paginator.get_next_link(),
                    "previous": paginator.get_previous_link(),
                },
                "results": page_data,
                "huertas": page_data  # alias compat
            }
        )
