# backend/gestion_bodega/views/recepciones_views.py
from datetime import date, timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from agroproductores_risol.utils.pagination import GenericPagination
from gestion_bodega.models import (
    Bodega,
    Recepcion,
    TemporadaBodega,
    CierreSemanal,
)
from gestion_bodega.permissions import HasModulePermission
from gestion_bodega.serializers import RecepcionSerializer
from gestion_bodega.utils.activity import registrar_actividad
from gestion_bodega.utils.audit import ViewSetAuditMixin
from gestion_bodega.utils.notification_handler import NotificationHandler
from gestion_bodega.utils.semana import semana_cerrada_ids as _semana_cerrada


# ───────────────────────────────────────────────────────────────────────────
# Helpers / Mixin
# ───────────────────────────────────────────────────────────────────────────


def _normalize_estado(raw, default: str = "activas") -> str:
    """
    Normaliza variantes de estado a uno de:
      - 'activas'
      - 'archivadas'
      - 'todas'
    (por si en el futuro se usa en filtros de estado).
    """
    val = (raw or default).strip().lower()
    mapping = {
        "activos": "activas",
        "activas": "activas",
        "archivados": "archivadas",
        "archivadas": "archivadas",
        "todos": "todas",
        "todas": "todas",
        "all": "todas",
    }
    return mapping.get(val, default)


class NotificationMixin:
    """Mixin para devolver respuestas con el formato estándar del sistema."""

    def notify(self, *, key: str, data=None, status_code=status.HTTP_200_OK):
        return NotificationHandler.generate_response(
            message_key=key,
            data=data or {},
            status_code=status_code,
        )

    def get_pagination_meta(self):
        """
        Devuelve el meta estándar basado en GenericPagination.
        Si por alguna razón no hay paginator/page, devuelve un meta vacío seguro.
        """
        paginator = getattr(self, "paginator", None)
        page = getattr(paginator, "page", None) if paginator else None
        if not paginator or page is None:
            return {
                "count": 0,
                "next": None,
                "previous": None,
                "page": None,
                "page_size": None,
                "total_pages": None,
            }
        return {
            "count": page.paginator.count,
            "next": paginator.get_next_link(),
            "previous": paginator.get_previous_link(),
            "page": page.number,
            "page_size": paginator.get_page_size(self.request),
            "total_pages": page.paginator.num_pages,
        }


def _msg_in(errors_dict, text_substring: str) -> bool:
    """Busca un substring en cualquier mensaje del dict de errores de DRF."""
    for _, msgs in (errors_dict or {}).items():
        if isinstance(msgs, (list, tuple)):
            for m in msgs:
                if text_substring.lower() in str(m).lower():
                    return True
        elif isinstance(msgs, str) and text_substring.lower() in msgs.lower():
            return True
    return False


def _map_recepcion_validation_errors(errors: dict) -> tuple[str, dict]:
    """
    Traduce errores de validación del serializer a message_keys
    coherentes con el frontend.
    """
    if _msg_in(errors, "La temporada debe estar activa y no finalizada"):
        return "recepcion_temporada_invalida", {"errors": errors}
    if _msg_in(errors, "cantidad de cajas") or _msg_in(errors, "debe ser positiva"):
        return "recepcion_cantidad_invalida", {"errors": errors}
    if (
        _msg_in(errors, "semana activa")
        or _msg_in(errors, "no pertenece a esta bodega y temporada")
        or _msg_in(errors, "dentro del rango de la semana")
        or _msg_in(errors, "semana cerrada")
    ):
        return "recepcion_semana_invalida", {"errors": errors}
    return "validation_error", {"errors": errors}


def _resolve_semana_for_fecha(bodega: Bodega, temporada: TemporadaBodega, fecha: date):
    """
    Busca CierreSemanal activo que cubra la fecha.

    Regla de negocio compartida con el Tablero:
      - Semana cerrada: usa fecha_hasta real.
      - Semana abierta: fin teórico = fecha_desde + 6 días.

    Si encuentra una semana cuyo rango [fecha_desde, fecha_hasta/teórico] incluya la fecha,
    la devuelve; si no, devuelve None (la recepción queda sin semana asociada).
    """
    qs = (
        CierreSemanal.objects.filter(
            bodega=bodega,
            temporada=temporada,
            is_active=True,
        )
        .order_by("-fecha_desde")
    )

    for c in qs:
        start = c.fecha_desde
        end = c.fecha_hasta or (c.fecha_desde + timedelta(days=6))
        if start <= fecha <= end:
            return c
    return None


# ───────────────────────────────────────────────────────────────────────────
# ViewSet
# ───────────────────────────────────────────────────────────────────────────


class RecepcionViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de Recepciones (entrada de mango desde campo).

    Reglas clave:
      - La temporada debe estar activa y no finalizada.
      - La bodega de la recepción debe coincidir con la bodega de la temporada.
      - CierreSemanal bloquea crear/editar/archivar/restaurar en fechas cerradas.
      - Patrón global de soft delete: archivar antes de eliminar.
      - Cada recepción intenta quedar amarrada a la semana (CierreSemanal) que cubre su fecha.
    """

    serializer_class = RecepcionSerializer
    queryset = (
        Recepcion.objects.select_related("bodega", "temporada", "semana")
        .order_by("-fecha", "-id")
    )
    pagination_class = GenericPagination

    permission_classes = [IsAuthenticated, HasModulePermission]
    _perm_map = {
        "list": ["view_recepcion"],
        "retrieve": ["view_recepcion"],
        "create": ["add_recepcion"],
        "update": ["change_recepcion"],
        "partial_update": ["change_recepcion"],
        "destroy": ["delete_recepcion"],
        "archivar": ["archive_recepcion"],
        "restaurar": ["restore_recepcion"],
    }

    # Filtros simples (bodega/temporada/semana)
    filter_backends = [DjangoFilterBackend]
    filterset_fields = {
        "bodega": ["exact"],
        "temporada": ["exact"],
        "semana": ["exact"],
    }
    ordering = ["-fecha", "-id"]

    # ---------- permisos por acción ----------
    def get_permissions(self):
        self.required_permissions = self._perm_map.get(self.action, ["view_recepcion"])
        return [p() for p in self.permission_classes]

    # ---------- queryset dinámico ----------
    def get_queryset(self):
        """
        Por ahora no modificamos el queryset según acción,
        pero dejamos el hook por si más adelante se requiere.
        """
        qs = super().get_queryset()
        if self.action in [
            "retrieve",
            "update",
            "partial_update",
            "destroy",
            "archivar",
            "restaurar",
        ]:
            return qs
        return qs

    # ---------- LIST ----------
    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            ser = self.get_serializer(page, many=True)
        else:
            ser = self.get_serializer(qs, many=True)

        meta = self.get_pagination_meta()
        payload = {
            "recepciones": ser.data,  # alias específico
            "results": ser.data,      # alias genérico para TableLayout
            "meta": meta,
        }
        return self.notify(
            key="data_processed_success",
            data=payload,
            status_code=status.HTTP_200_OK,
        )

    # ---------- CREATE ----------
    def create(self, request, *args, **kwargs):
        data = request.data.copy()

        # Normalización de payload desde el FE (alias comunes)
        if "bodega" in data and "bodega_id" not in data:
            data["bodega_id"] = data.get("bodega")
        if "temporada" in data and "temporada_id" not in data:
            data["temporada_id"] = data.get("temporada")
        if "cantidad_cajas" in data and "cajas_campo" not in data:
            data["cajas_campo"] = data.get("cantidad_cajas")

        ser = self.get_serializer(data=data)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload = _map_recepcion_validation_errors(
                getattr(ex, "detail", ser.errors)
            )
            return self.notify(
                key=key,
                data=payload,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        temporada: TemporadaBodega = ser.validated_data["temporada"]
        bodega: Bodega = ser.validated_data["bodega"]
        f: date = ser.validated_data["fecha"]

        # Consistencia Bodega <-> Temporada
        if temporada.bodega_id != bodega.id:
            return self.notify(
                key="recepcion_bodega_temporada_incongruente",
                data={
                    "info": "La bodega de la recepción debe coincidir con la bodega de la temporada."
                },
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Estado de temporada
        if not temporada.is_active or temporada.finalizada:
            return self.notify(
                key="recepcion_temporada_invalida",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Cierre semanal (regla de negocio compartida con tablero)
        if _semana_cerrada(bodega.id, temporada.id, f):
            return self.notify(
                key="recepcion_semana_cerrada",
                status_code=status.HTTP_409_CONFLICT,
            )

        try:
            with transaction.atomic():
                obj: Recepcion = ser.save()

                # Resolver y amarrar semana según la fecha
                semana = _resolve_semana_for_fecha(bodega, temporada, f)
                if semana != obj.semana:
                    obj.semana = semana
                    obj.save(update_fields=["semana", "actualizado_en"])
        except DjangoValidationError as ex:
            errors = getattr(ex, "message_dict", {"non_field_errors": ex.messages})

            key, payload = _map_recepcion_validation_errors(errors)
            return self.notify(
                key=key,
                data=payload,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        registrar_actividad(
            request.user,
            f"Creó recepción #{obj.id} (bodega {bodega.id}, temporada {temporada.id})",
        )
        return self.notify(
            key="recepcion_create_success",
            data={"recepcion": self.get_serializer(obj).data},
            status_code=status.HTTP_201_CREATED,
        )

    # ---------- UPDATE ----------
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance: Recepcion = self.get_object()

        # No editar archivadas
        if not instance.is_active:
            return self.notify(
                key="registro_archivado_no_editar",
                data={"info": "No puedes editar una recepción archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        data = request.data.copy()

        # Normalización de payload desde el FE
        if "bodega" in data and "bodega_id" not in data:
            data["bodega_id"] = data.get("bodega")
        if "temporada" in data and "temporada_id" not in data:
            data["temporada_id"] = data.get("temporada")
        if "cantidad_cajas" in data and "cajas_campo" not in data:
            data["cajas_campo"] = data.get("cantidad_cajas")

        ser = self.get_serializer(instance, data=data, partial=partial)
        try:
            ser.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload = _map_recepcion_validation_errors(
                getattr(ex, "detail", ser.errors)
            )
            return self.notify(
                key=key,
                data=payload,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        temporada: TemporadaBodega = ser.validated_data.get(
            "temporada", instance.temporada
        )
        bodega: Bodega = ser.validated_data.get("bodega", instance.bodega)
        f: date = ser.validated_data.get("fecha", instance.fecha)

        # Consistencia Bodega <-> Temporada
        if temporada.bodega_id != bodega.id:
            return self.notify(
                key="recepcion_bodega_temporada_incongruente",
                data={
                    "info": "La bodega de la recepción debe coincidir con la bodega de la temporada."
                },
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Estado de temporada
        if not temporada.is_active or temporada.finalizada:
            return self.notify(
                key="recepcion_temporada_invalida",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Bloqueo por cierre: tanto fecha original como nueva
        if _semana_cerrada(
            instance.bodega_id, instance.temporada_id, instance.fecha
        ) or _semana_cerrada(bodega.id, temporada.id, f):
            return self.notify(
                key="recepcion_semana_cerrada",
                status_code=status.HTTP_409_CONFLICT,
            )

        try:
            with transaction.atomic():
                obj: Recepcion = ser.save()

                # Recalcular semana si cambió fecha/bodega/temporada
                semana = _resolve_semana_for_fecha(bodega, temporada, f)
                if semana != obj.semana:
                    obj.semana = semana
                    obj.save(update_fields=["semana", "actualizado_en"])
        except DjangoValidationError as ex:
            errors = getattr(ex, "message_dict", {"non_field_errors": ex.messages})

            key, payload = _map_recepcion_validation_errors(errors)
            return self.notify(
                key=key,
                data=payload,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        registrar_actividad(request.user, f"Actualizó recepción #{obj.id}")
        return self.notify(
            key="recepcion_update_success",
            data={"recepcion": self.get_serializer(obj).data},
            status_code=status.HTTP_200_OK,
        )

    # ---------- PARTIAL UPDATE ----------
    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    # ---------- DELETE (hard) ----------
    def destroy(self, request, *args, **kwargs):
        instance: Recepcion = self.get_object()

        # Patrón del sistema: archivar antes de eliminar
        if instance.is_active:
            return self.notify(
                key="recepcion_debe_estar_archivada",
                data={"error": "Debes archivar la recepción antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Dependencias duras: si hay clasificaciones asociadas, no permitir
        if hasattr(instance, "clasificaciones") and instance.clasificaciones.exists():
            return self.notify(
                key="recepcion_con_dependencias",
                data={
                    "error": "No se puede eliminar: existen clasificaciones asociadas."
                },
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Bloqueo por semana cerrada, basado en la fecha del propio registro
        if _semana_cerrada(
            instance.bodega_id, instance.temporada_id, instance.fecha
        ):
            return self.notify(
                key="recepcion_semana_cerrada",
                status_code=status.HTTP_409_CONFLICT,
            )

        rec_id = instance.id
        self.perform_destroy(instance)
        registrar_actividad(request.user, f"Eliminó recepción #{rec_id}")
        return self.notify(
            key="recepcion_delete_success",
            data={"deleted_id": rec_id},
            status_code=status.HTTP_200_OK,
        )

    # ---------- ARCHIVAR ----------
    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        instance: Recepcion = self.get_object()

        if not instance.is_active:
            return self.notify(
                key="recepcion_ya_archivada",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if _semana_cerrada(
            instance.bodega_id, instance.temporada_id, instance.fecha
        ):
            return self.notify(
                key="recepcion_semana_cerrada",
                status_code=status.HTTP_409_CONFLICT,
            )

        with transaction.atomic():
            instance.archivar()

        registrar_actividad(request.user, f"Archivó recepción #{instance.id}")
        return self.notify(
            key="recepcion_archivada",
            data={"recepcion_id": instance.id},
            status_code=status.HTTP_200_OK,
        )

    # ---------- RESTAURAR ----------
    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        instance: Recepcion = self.get_object()

        if instance.is_active:
            return self.notify(
                key="recepcion_ya_activa",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Estado de temporada (debe poder operar)
        if not instance.temporada.is_active or instance.temporada.finalizada:
            return self.notify(
                key="recepcion_temporada_invalida",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Cierre semanal (fecha del propio registro)
        if _semana_cerrada(
            instance.bodega_id, instance.temporada_id, instance.fecha
        ):
            return self.notify(
                key="recepcion_semana_cerrada",
                status_code=status.HTTP_409_CONFLICT,
            )

        with transaction.atomic():
            instance.desarchivar()

        registrar_actividad(request.user, f"Restauró recepción #{instance.id}")
        return self.notify(
            key="recepcion_restaurada",
            data={"recepcion": self.get_serializer(instance).data},
            status_code=status.HTTP_200_OK,
        )
