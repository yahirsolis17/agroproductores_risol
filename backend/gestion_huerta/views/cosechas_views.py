# src/modules/gestion_huerta/views/cosecha_views.py
from django.utils import timezone
from django.db import transaction
from rest_framework import viewsets, status, serializers, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from gestion_huerta.models import Cosecha, Temporada
from gestion_huerta.serializers import CosechaSerializer
from gestion_huerta.utils.activity import registrar_actividad
from gestion_huerta.utils.audit import ViewSetAuditMixin
from agroproductores_risol.utils.pagination import GenericPagination
from gestion_huerta.views.huerta_views import NotificationMixin, _has_error_code
from gestion_usuarios.permissions import HasModulePermission


# 👉 Límite global por temporada (usado en create)
MAX_COSECHAS_POR_TEMPORADA = 6


def _map_cosecha_validation_errors(errors: dict) -> tuple[str, dict]:
    """
    Traduce los mensajes del serializer/modelo a claves específicas de notificación.
    Devuelve (key, data) para NotificationHandler.
    """
    # _has_error_code importado de huerta_views

    if _has_error_code(errors, "falta_temporada"):
        return "cosecha_temporada_requerida", {"errors": errors}
    if _has_error_code(errors, "fechas_inconsistentes"):
        return "cosecha_fechas_incoherentes", {"errors": errors}
    if _has_error_code(errors, "temporada_archivada"):
        return "cosecha_temporada_archivada", {"errors": errors}
    if _has_error_code(errors, "temporada_finalizada"):
        return "cosecha_temporada_finalizada", {"errors": errors}
    if _has_error_code(errors, "max_cosechas_alcanzado"):
        return "cosecha_limite_temporada", {"errors": errors}
    if _has_error_code(errors, "unique"):
        return "cosecha_duplicada", {"errors": errors}
    if _has_error_code(errors, "cosecha_activa_existente"):
        return "cosecha_activa_existente", {"errors": errors}
    if _has_error_code(errors, "cambio_temporada_prohibido"):
        return "cosecha_cambiar_temporada_prohibido", {"errors": errors}
    if _has_error_code(errors, "nombre_muy_corto"):
        return "cosecha_nombre_corto", {"errors": errors}

    return "validation_error", {"errors": errors}


def _get_temporada_id_from_payload(data):
    """Acepta 'temporada' o 'temporada_id' en el payload."""
    if isinstance(data, dict):
        return data.get("temporada") or data.get("temporada_id")
    return None


def _has_perm(user, codename: str) -> bool:
    """
    Admin pasa siempre; si no, exige 'gestion_huerta.<codename>'.
    """
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "role", None) == "admin":
        return True
    return user.has_perm(f"gestion_huerta.{codename}")


class CosechaViewSet(ViewSetAuditMixin, NotificationMixin, viewsets.ModelViewSet):
    """
    CRUD de cosechas + acciones custom (archivar, restaurar, finalizar/toggle)
    con integridad de datos (soft-delete, cascada, validaciones) y notificaciones uniformes.
    """
    serializer_class   = CosechaSerializer
    queryset           = Cosecha.objects.select_related("temporada", "huerta", "huerta_rentada").order_by("-id")
    pagination_class   = GenericPagination
    permission_classes = [
        IsAuthenticated,
        HasModulePermission,
    ]

    _perm_map = {
        "list":               ["view_cosecha"],
        "retrieve":           ["view_cosecha"],
        "create":             ["add_cosecha"],
        "update":             ["change_cosecha"],
        "partial_update":     ["change_cosecha"],
        "destroy":            ["delete_cosecha"],
        "archivar":           ["archive_cosecha"],
        "restaurar":          ["restore_cosecha"],
        "finalizar":          ["finalize_cosecha"],
        "toggle_finalizada":  ["finalize_cosecha", "reactivate_cosecha"],  # se afina dinámicamente abajo
        "reactivar":          ["reactivate_cosecha"],
    }

    def get_permissions(self):
        # Afinar dinámicamente el permiso requerido en toggle:
        if self.action == "toggle_finalizada":
            required = ["finalize_cosecha", "reactivate_cosecha"]
            pk = self.kwargs.get("pk")
            if pk:
                try:
                    finalizada = Cosecha.objects.only("id", "finalizada").get(pk=pk).finalizada
                    # Si va a finalizar (no finalizada) → finalize; si va a reactivar → reactivate
                    required = ["reactivate_cosecha"] if finalizada else ["finalize_cosecha"]
                except Cosecha.DoesNotExist:
                    pass
            self.required_permissions = required
        else:
            self.required_permissions = self._perm_map.get(self.action, ["view_cosecha"])
        return [p() for p in self.permission_classes]

    # 🔎 Búsqueda por nombre
    filter_backends = [filters.SearchFilter]
    search_fields   = ['nombre']

    # ------------------------------ QUERYSET DINÁMICO ------------------------------
    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        # Incluir todas en acciones de detalle (evita 404 por filtros)
        if self.action in [
            'retrieve', 'update', 'partial_update', 'destroy',
            'archivar', 'restaurar', 'finalizar', 'toggle_finalizada', 'reactivar'
        ]:
            return qs

        # Filtro por temporada (acepta 'temporada' y alias 'temporada_id')
        temp_id = params.get("temporada") or params.get("temporada_id")
        if temp_id:
            qs = qs.filter(temporada_id=temp_id)

        # Filtro por estado activo/archivado
        estado = (params.get("estado") or "activas").strip().lower()
        if estado in ("activas", "activos"):
            qs = qs.filter(is_active=True)
        elif estado in ("archivadas", "archivados"):
            qs = qs.filter(is_active=False)
        elif estado in ("todos", "all"):
            pass

        # Filtro por finalización (opcional, consistente con Temporadas)
        finalizada = params.get("finalizada")
        if finalizada is not None:
            low = str(finalizada).lower()
            if low in ('true', '1'):
                qs = qs.filter(finalizada=True)
            elif low in ('false', '0'):
                qs = qs.filter(finalizada=False)

        return qs.order_by("-id")

    # ------------------------------ LIST ------------------------------
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        # ➕ total_registradas (todas las cosechas de la temporada, sin filtrar por estado)
        temp_id_param = request.query_params.get("temporada") or request.query_params.get("temporada_id")
        total_registradas = 0
        if temp_id_param:
            try:
                total_registradas = Cosecha.objects.filter(temporada_id=int(temp_id_param)).count()
            except (TypeError, ValueError):
                total_registradas = 0

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            meta = {
                "count": self.paginator.page.paginator.count,
                "next": self.paginator.get_next_link(),
                "previous": self.paginator.get_previous_link(),
                "page": self.paginator.page.number,
                "page_size": self.paginator.get_page_size(request),
                "total_pages": self.paginator.page.paginator.num_pages,
            }
            return self.notify(
                key="data_processed_success",
                data={"results": serializer.data, "meta": meta, "extra": {"total_registradas": total_registradas}}
            )

        serializer = self.get_serializer(queryset, many=True)
        meta = {
            "count": len(serializer.data),
            "next": None,
            "previous": None,
            "page": 1,
            "page_size": len(serializer.data),
            "total_pages": 1,
        }
        return self.notify(
            key="data_processed_success",
            data={"results": serializer.data, "meta": meta, "extra": {"total_registradas": total_registradas}}
        )

    # ------------------------------ CREATE ------------------------------
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        # Normalizar fechas vacías
        for f in ("fecha_inicio", "fecha_fin"):
            if f in data and data[f] in [None, "", "null", "None"]:
                data[f] = None

        # ✅ PRECHECK: límite por temporada (incluye activas + archivadas)
        temporada_id = _get_temporada_id_from_payload(data)
        if temporada_id:
            try:
                temp_id_int = int(temporada_id)
                total = Cosecha.objects.filter(temporada_id=temp_id_int).count()
                if total >= MAX_COSECHAS_POR_TEMPORADA:
                    return self.notify(
                        key="cosecha_limite_temporada",
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
            except (TypeError, ValueError):
                pass  # dejar que el serializer valide temporada

        serializer = self.get_serializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload = _map_cosecha_validation_errors(getattr(ex, 'detail', serializer.errors))
            return self.notify(key=key, data=payload, status_code=status.HTTP_400_BAD_REQUEST)

        instance = serializer.save()  # is_active=True por defecto (modelo)
        registrar_actividad(request.user, f"Creó la cosecha: {instance.nombre}")

        return self.notify(
            key="cosecha_create_success",
            data={"cosecha": self.get_serializer(instance).data},
            status_code=status.HTTP_201_CREATED,
        )

    # ------------------------------ UPDATE ------------------------------
    def update(self, request, *args, **kwargs):
        partial    = kwargs.pop("partial", False)
        instance   = self.get_object()

        # 🔒 Política de edición
        if not instance.is_active:
            return self.notify(
                key="cosecha_archivada_no_editar",
                data={"info": "No puedes editar una cosecha archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if instance.finalizada:
            return self.notify(
                key="cosecha_finalizada_no_editar",
                data={"info": "No puedes editar una cosecha finalizada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        # Estado de la temporada también aplica
        if not instance.temporada.is_active:
            return self.notify(
                key="cosecha_temporada_archivada_no_editar",
                data={"info": "No puedes editar una cosecha cuya temporada está archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if instance.temporada.finalizada:
            return self.notify(
                key="cosecha_temporada_finalizada_no_editar",
                data={"info": "No puedes editar una cosecha cuya temporada está finalizada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        try:
            serializer.is_valid(raise_exception=True)
        except serializers.ValidationError as ex:
            key, payload = _map_cosecha_validation_errors(getattr(ex, 'detail', serializer.errors))
            return self.notify(key=key, data=payload, status_code=status.HTTP_400_BAD_REQUEST)

        self.perform_update(serializer)
        registrar_actividad(request.user, f"Actualizó la cosecha: {instance.nombre}")
        return self.notify(
            key="cosecha_update_success",
            data={"cosecha": serializer.data},
        )

    # ------------------------------ DELETE ------------------------------
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        # Igual que huertas/temporadas: archivar antes de eliminar
        if instance.is_active:
            return self.notify(
                key="cosecha_debe_estar_archivada",
                data={"error": "Debes archivar la cosecha antes de eliminarla."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Dependencias duras
        if instance.inversiones.exists() or instance.ventas.exists():
            return self.notify(
                key="cosecha_con_dependencias",
                data={"error": "No se puede eliminar. Tiene registros de inversiones o ventas asociadas."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        nombre = instance.nombre
        self.perform_destroy(instance)
        registrar_actividad(request.user, f"Eliminó la cosecha: {nombre}")
        return self.notify(
            key="cosecha_delete_success",
            data={"info": "Cosecha eliminada."},
        )

    # ------------------------------ ACCIONES CUSTOM ------------------------------
    @action(detail=True, methods=["post"], url_path="archivar")
    def archivar(self, request, pk=None):
        if not _has_perm(request.user, "archive_cosecha"):
            return self.notify(
                key="permission_denied",
                data={"info": "No tienes permiso para archivar cosechas."},
                status_code=status.HTTP_403_FORBIDDEN,
            )
        c = self.get_object()
        if not c.is_active:
            return self.notify(key="cosecha_ya_archivada", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                c.archivar()  # cascada a inversiones/ventas
        except Exception:
            return self.notify(
                key="operacion_atomica_fallida",
                data={"info": "No se pudo completar la operación."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        registrar_actividad(request.user, f"Archivó la cosecha: {c.nombre}")
        return self.notify(key="cosecha_archivada", data={"cosecha": self.get_serializer(c).data})

    @action(detail=True, methods=["post"], url_path="restaurar")
    def restaurar(self, request, pk=None):
        if not _has_perm(request.user, "restore_cosecha"):
            return self.notify(
                key="permission_denied",
                data={"info": "No tienes permiso para restaurar cosechas."},
                status_code=status.HTTP_403_FORBIDDEN,
            )
        c = self.get_object()
        if c.is_active:
            return self.notify(key="cosecha_no_archivada", status_code=status.HTTP_400_BAD_REQUEST)

        # Precondiciones: temporada debe estar activa y no finalizada
        if not c.temporada.is_active:
            return self.notify(
                key="cosecha_temporada_archivada_no_restaurar",
                data={"info": "No puedes restaurar una cosecha cuya temporada está archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if c.temporada.finalizada:
            return self.notify(
                key="cosecha_temporada_finalizada_no_restaurar",
                data={"info": "No puedes restaurar una cosecha cuya temporada está finalizada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                c.desarchivar()  # cascada a inversiones/ventas
        except Exception:
            return self.notify(
                key="operacion_atomica_fallida",
                data={"info": "No se pudo completar la operación."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        registrar_actividad(request.user, f"Restauró la cosecha: {c.nombre}")
        return self.notify(key="cosecha_restaurada", data={"cosecha": self.get_serializer(c).data})

    @action(detail=True, methods=["post"], url_path="finalizar")
    def finalizar(self, request, pk=None):
        c = self.get_object()

        # 🔐 Reforzar permiso explícito por si el mapeo previo no alcanzara
        if not _has_perm(request.user, "finalize_cosecha"):
            return self.notify(
                key="permission_denied",
                data={"info": "No tienes permiso para finalizar cosechas."},
                status_code=status.HTTP_403_FORBIDDEN,
            )

        # No finalizar si la temporada está archivada o finalizada (consistente con reglas)
        if not c.temporada.is_active:
            return self.notify(
                key="cosecha_temporada_archivada_no_finalizar",
                data={"info": "No puedes finalizar/reactivar una cosecha cuya temporada está archivada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if c.temporada.finalizada:
            return self.notify(
                key="cosecha_temporada_finalizada_no_restaurar",
                data={"info": "No puedes finalizar una cosecha cuya temporada está finalizada."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if c.finalizada:
            return self.notify(key="cosecha_ya_finalizada", status_code=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                c.finalizar()
        except Exception:
            return self.notify(
                key="operacion_atomica_fallida",
                data={"info": "No se pudo completar la operación."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        registrar_actividad(request.user, f"Finalizó la cosecha: {c.nombre}")
        return self.notify(key="cosecha_finalizada", data={"cosecha": self.get_serializer(c).data})

    @action(detail=True, methods=["post"], url_path="toggle-finalizada")
    def toggle_finalizada(self, request, pk=None):
        c = self.get_object()
        target_finalizada = not c.finalizada
        required = "finalize_cosecha" if target_finalizada else "reactivate_cosecha"
        if not _has_perm(request.user, required):
            info = "finalizar" if target_finalizada else "reactivar"
            return self.notify(
                key="permission_denied",
                data={"info": f"No tienes permiso para {info} cosechas."},
                status_code=status.HTTP_403_FORBIDDEN,
            )

        try:
            with transaction.atomic():
                # ⛔ Nunca permitir operar si la temporada está archivada
                if not c.temporada.is_active:
                    return self.notify(
                        key="cosecha_temporada_archivada_no_finalizar",
                        data={"info": "No puedes finalizar/reactivar una cosecha cuya temporada está archivada."},
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )

                if target_finalizada:
                    # 👉 Finalizar
                    if c.temporada.finalizada:
                        return self.notify(
                            key="cosecha_temporada_finalizada_no_restaurar",
                            data={"info": "No puedes finalizar una cosecha cuya temporada está finalizada."},
                            status_code=status.HTTP_400_BAD_REQUEST,
                        )
                    c.finalizada = True
                    c.fecha_fin = timezone.now()
                    c.save(update_fields=["finalizada", "fecha_fin"])
                    try:
                        registrar_actividad(request.user, f"Finalizó la cosecha: {c.nombre}")
                    except Exception:
                        pass
                    return self.notify(
                        key="cosecha_finalizada",
                        data={"cosecha": self.get_serializer(c).data},
                        status_code=status.HTTP_200_OK,
                    )

                # 👉 Reactivar
                if c.temporada.finalizada:
                    return self.notify(
                        key="cosecha_temporada_finalizada_no_restaurar",
                        data={"info": "No puedes reactivar una cosecha cuya temporada está finalizada."},
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )

                existe_activa = Cosecha.objects.filter(
                    temporada=c.temporada,
                    is_active=True,
                    finalizada=False
                ).exclude(pk=c.pk).exists()
                if existe_activa:
                    return self.notify(
                        key="cosecha_activa_existente",
                        data={"errors": {"non_field_errors": ["Ya existe una cosecha activa en esta temporada."]}},
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )

                c.finalizada = False
                c.fecha_fin = None
                c.save(update_fields=["finalizada", "fecha_fin"])
                try:
                    registrar_actividad(request.user, f"Reactivó la cosecha: {c.nombre}")
                except Exception:
                    pass

                return self.notify(
                    key="cosecha_reactivada",
                    data={"cosecha": self.get_serializer(c).data},
                    status_code=status.HTTP_200_OK,
                )

        except Exception:
            return self.notify(
                key="operacion_atomica_fallida",
                data={"info": "No se pudo completar la operación."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"], url_path="reactivar")
    def reactivar(self, request, pk=None):
        # Alias compatible con UI: usa toggle
        return self.toggle_finalizada(request, pk=pk)
