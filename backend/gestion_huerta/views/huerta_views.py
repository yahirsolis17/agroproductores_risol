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
#  🏠  PROPIETARIOS
# ---------------------------------------------------------------------------
class PropietarioViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    queryset = Propietario.objects.all().order_by('-id')
    serializer_class = PropietarioSerializer
    pagination_class = GenericPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'apellidos', 'telefono']
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    # ---------- LIST ----------
    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        serializer = self.get_serializer(page, many=True)
        return self.notify(
            key="data_processed_success",
            data={
                "propietarios": serializer.data,
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
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": serializer.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
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
        except serializers.ValidationError:
            return self.notify(
                key="validation_error",
                data={"errors": serializer.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_update(serializer)
        return self.notify(
            key="propietario_update_success",
            data={"propietario": serializer.data}
        )

    # ---------- DELETE ----------
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.huertas.exists():
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
        if search := request.query_params.get("search"):
            qs = qs.filter(
                Q(nombre__icontains=search) |
                Q(apellidos__icontains=search)
            )
            self.pagination_class.page_size = 50
        page = self.paginate_queryset(qs)
        serializer = self.get_serializer(page, many=True)
        return self.notify(
            key="data_processed_success",
            data={
                "propietarios": serializer.data,
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
        if archivado_param := params.get("archivado"):
            low = archivado_param.lower()
            if low in ["activos", "false"]:
                qs = qs.filter(archivado_en__isnull=True)
            elif low in ["archivados", "true"]:
                qs = qs.filter(archivado_en__isnull=False)
        if id_param := params.get("id"):
            try:
                return qs.filter(id=int(id_param))
            except ValueError:
                pass
        if nombre := params.get("nombre"):
            return qs.filter(nombre=nombre)
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


# ---------------------------------------------------------------------------
#  🌳  HUERTAS PROPIAS
# ---------------------------------------------------------------------------
class HuertaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    serializer_class = HuertaSerializer
    queryset = Huerta.objects.all().order_by('-id')
    pagination_class = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    # ---------------- LIST ----------------
    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        serializer = self.get_serializer(page, many=True)
        return self.notify(
            key="data_processed_success",
            data={
                "huertas": serializer.data,
                "meta": {
                    "count": self.paginator.page.paginator.count,
                    "next": self.paginator.get_next_link(),
                    "previous": self.paginator.get_previous_link(),
                }
            },
            status_code=status.HTTP_200_OK
        )

    # ---------------- CREATE ----------------
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
            key="huerta_create_success",
            data={"huerta": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    # ---------------- UPDATE ----------------
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        ser = self.get_serializer(instance, data=request.data, partial=partial)
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
            key="huerta_update_success",
            data={"huerta": ser.data}
        )

    # ---------------- DELETE ----------------
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_active:
            return self.notify(
                key="huerta_debe_estar_archivada",
                data={"error": "Debes archivar la huerta antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if instance.cosechas.exists():
            return self.notify(
                key="huerta_con_dependencias",
                data={"error": "No se puede eliminar. Tiene cosechas registradas."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_destroy(instance)
        return self.notify(
            key="huerta_delete_success",
            data={"info": "Huerta eliminada."}
        )

    # ---------------- CUSTOM ACTIONS ----------------
    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        instance = self.get_object()
        if not instance.is_active:
            return self.notify(
                key="ya_esta_archivada",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        instance.is_active = False
        instance.archivado_en = timezone.now()
        instance.save()
        registrar_actividad(request.user, f"Archivó la huerta: {instance.nombre}")
        return self.notify(
            key="huerta_archivada",
            data={"huerta_id": instance.id}
        )

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        instance = self.get_object()
        if instance.is_active:
            return self.notify(
                key="ya_esta_activa",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        instance.is_active = True
        instance.archivado_en = None
        instance.save()
        registrar_actividad(request.user, f"Restauró la huerta: {instance.nombre}")
        return self.notify(
            key="huerta_restaurada",
            data={"huerta_id": instance.id}
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
            self.pagination_class.page_size = 10
        if prop := params.get("propietario"):
            qs = qs.filter(propietario_id=prop)
        if nombre := params.get("nombre"):
            qs = qs.filter(nombre__icontains=nombre)
        return qs


# ---------------------------------------------------------------------------
#  🏡  HUERTAS RENTADAS
# ---------------------------------------------------------------------------
class HuertaRentadaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    serializer_class = HuertaRentadaSerializer
    queryset = HuertaRentada.objects.all().order_by('-id')
    pagination_class = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    # ---------------- LIST ----------------
    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.filter_queryset(self.get_queryset()))
        serializer = self.get_serializer(page, many=True)
        return self.notify(
            key="data_processed_success",
            data={
                "huertas_rentadas": serializer.data,
                "meta": {
                    "count": self.paginator.page.paginator.count,
                    "next": self.paginator.get_next_link(),
                    "previous": self.paginator.get_previous_link(),
                }
            },
            status_code=status.HTTP_200_OK
        )

    # ---------------- CREATE ----------------
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
            key="huerta_rentada_create_success",
            data={"huerta_rentada": ser.data},
            status_code=status.HTTP_201_CREATED,
        )

    # ---------------- UPDATE ----------------
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        ser = self.get_serializer(instance, data=request.data, partial=partial)
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
            key="huerta_rentada_update_success",
            data={"huerta_rentada": ser.data}
        )

    # ---------------- DELETE ----------------
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_active:
            return self.notify(
                key="huerta_debe_estar_archivada",
                data={"error": "Debes archivar la huerta antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        self.perform_destroy(instance)
        return self.notify(
            key="huerta_rentada_delete_success",
            data={"info": "Huerta rentada eliminada."}
        )

    # ---------------- CUSTOM ACTIONS ----------------
    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        instance = self.get_object()
        if not instance.is_active:
            return self.notify(
                key="ya_esta_archivada",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        instance.is_active = False
        instance.archivado_en = timezone.now()
        instance.save()
        registrar_actividad(request.user, f"Archivó la huerta rentada: {instance.nombre}")
        return self.notify(
            key="huerta_archivada",
            data={"huerta_rentada_id": instance.id}
        )

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        instance = self.get_object()
        if instance.is_active:
            return self.notify(
                key="ya_esta_activa",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        instance.is_active = True
        instance.archivado_en = None
        instance.save()
        registrar_actividad(request.user, f"Restauró la huerta rentada: {instance.nombre}")
        return self.notify(
            key="huerta_restaurada",
            data={"huerta_rentada_id": instance.id}
        )

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
            self.pagination_class.page_size = 10
        if prop := params.get("propietario"):
            qs = qs.filter(propietario_id=prop)
        if nombre := params.get("nombre"):
            qs = qs.filter(nombre__icontains=nombre)
        return qs


class HuertasCombinadasViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.GenericViewSet):
    """
    Devuelve huertas propias + rentadas, con filtros y paginación unificados.
    """
    pagination_class = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    @action(detail=False, methods=["get"], url_path="combinadas")
    def listar_combinadas(self, request):
        params = request.query_params

        # Normalizar parámetros
        estado      = (params.get("estado") or "").strip().lower()
        tipo        = (params.get("tipo") or "").strip().lower()
        nombre      = params.get("nombre")
        propietario = params.get("propietario")

        # QuerySets base
        qs_propias = Huerta.objects.all().order_by('-id')
        qs_rent    = HuertaRentada.objects.all().order_by('-id')

        # Filtro de estado
        if estado in ("activos", "false"):
            qs_propias = qs_propias.filter(archivado_en__isnull=True)
            qs_rent    = qs_rent.filter(archivado_en__isnull=True)
        elif estado in ("archivados", "true"):
            qs_propias = qs_propias.filter(archivado_en__isnull=False)
            qs_rent    = qs_rent.filter(archivado_en__isnull=False)
        # estado='todos' → no filtrar

        # Filtros específicos
        if nombre:
            qs_propias = qs_propias.filter(nombre__icontains=nombre)
            qs_rent    = qs_rent.filter(nombre__icontains=nombre)
        if propietario:
            qs_propias = qs_propias.filter(propietario_id=propietario)
            qs_rent    = qs_rent.filter(propietario_id=propietario)

        # Unión según tipo
        combined = []
        if tipo in ("", "propia"):
            combined.extend(list(qs_propias))
        if tipo in ("", "rentada"):
            combined.extend(list(qs_rent))

        # Paginación unificada
        paginator = self.pagination_class()
        page_objs = paginator.paginate_queryset(combined, request)
        if not page_objs and paginator.page.number > 1:
            # Página inválida solicitada (demasiado alta)
            page_objs = []
        page_data = []
        for obj in page_objs:
            if isinstance(obj, Huerta):
                data = HuertaSerializer(obj).data
                data["tipo"] = "propia"
            else:
                data = HuertaRentadaSerializer(obj).data
                data["tipo"] = "rentada"
            page_data.append(data)

        return self.notify(
            key="data_processed_success",
            data={
                "huertas": page_data,
                "meta": {
                    "count": paginator.page.paginator.count,
                    "next": paginator.get_next_link(),
                    "previous": paginator.get_previous_link(),
                }
            }
        )
