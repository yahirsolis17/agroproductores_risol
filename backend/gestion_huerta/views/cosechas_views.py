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
from gestion_huerta.views.huerta_views import NotificationMixin
from gestion_huerta.permissions import HasHuertaModulePermission, HuertaGranularPermission


# 👉 Límite global por temporada (usado en create)
MAX_COSECHAS_POR_TEMPORADA = 6


def _map_cosecha_validation_errors(errors: dict) -> tuple[str, dict]:
    """
    Traduce los mensajes del serializer/modelo a claves específicas de notificación.
    Devuelve (key, data) para NotificationHandler.
    """
    def _texts(val):
        if val is None:
            return []
        if isinstance(val, (list, tuple)):
            return [str(x) for x in val]
        return [str(val)]

    # Posibles ubicaciones de errores
    buckets = []
    for k in ("non_field_errors", "__all__", "temporada", "nombre", "fecha_inicio", "fecha_fin"):
        if k in errors:
            buckets += _texts(errors[k])

    for msg in buckets:
        txt = msg.strip()

        # Mensajes exactos del CosechaSerializer / modelo
        if txt == "La cosecha debe pertenecer a una temporada.":
            return "cosecha_temporada_requerida", {"errors": errors}
        if txt == "La fecha de fin no puede ser anterior a la fecha de inicio.":
            return "cosecha_fechas_incoherentes", {"errors": errors}
        if txt == "No se pueden crear cosechas en una temporada archivada.":
            return "cosecha_temporada_archivada", {"errors": errors}
        if txt == "No se pueden crear cosechas en una temporada finalizada.":
            return "cosecha_temporada_finalizada", {"errors": errors}
        # 👇 Alineado con el clean() del modelo (cuando llegase como una sola frase)
        if txt == "No se pueden registrar cosechas en una temporada finalizada o archivada.":
            return "cosecha_temporada_no_permitida", {"errors": errors}
        if txt == "Esta temporada ya tiene el máximo de 6 cosechas permitidas.":
            return "cosecha_limite_temporada", {"errors": errors}
        if txt == "Ya existe una cosecha con ese nombre en esta temporada.":
            return "cosecha_duplicada", {"errors": errors}
        if txt == "Ya existe una cosecha activa en esta temporada.":
            return "cosecha_activa_existente", {"errors": errors}
        if txt == "No puedes cambiar la temporada de una cosecha existente.":
            return "cosecha_cambiar_temporada_prohibido", {"errors": errors}
        if txt == "El nombre de la cosecha debe tener al menos 3 caracteres.":
            return "cosecha_nombre_corto", {"errors": errors}

    # Fallback genérico
    return "validation_error", {"errors": errors}


def _get_temporada_id_from_payload(data):
    """Acepta 'temporada' o 'temporada_id' en el payload."""
    if isinstance(data, dict):
        return data.get("temporada") or data.get("temporada_id")
    return None


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
        HasHuertaModulePermission,
        HuertaGranularPermission,
    ]

    # 🔎 Búsqueda por nombre (sin duplicar lógica)
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
        estado = (params.get("estado") or "activas").lower()
        if estado == "activas":
            qs = qs.filter(is_active=True)
        elif estado == "archivadas":
            qs = qs.filter(is_active=False)

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
            return self.notify(
                key="data_processed_success",
                data={
                    "cosechas": serializer.data,
                    "meta": {
                        "count": self.paginator.page.paginator.count,
                        "next": self.paginator.get_next_link(),
                        "previous": self.paginator.get_previous_link(),
                        "total_registradas": total_registradas,  # 👈 NUEVO
                    }
                }
            )

        serializer = self.get_serializer(queryset, many=True)
        return self.notify(
            key="data_processed_success",
            data={
                "cosechas": serializer.data,
                "meta": {
                    "count": len(serializer.data),
                    "next": None,
                    "previous": None,
                    "total_registradas": total_registradas,  # 👈 NUEVO
                }
            }
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

        try:
            with transaction.atomic():
                # Estado objetivo: si estaba finalizada, vamos a reactivar; si no, a finalizar.
                target_finalizada = not c.finalizada

                # ⛔ Nunca permitir operar si la temporada está archivada
                if not c.temporada.is_active:
                    return self.notify(
                        key="cosecha_temporada_archivada_no_finalizar",
                        data={"info": "No puedes finalizar/reactivar una cosecha cuya temporada está archivada."},
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )

                if target_finalizada:
                    # 👉 Finalizar
                    # La temporada NO debe estar finalizada para finalizar la cosecha (consistencia)
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

                else:
                    # 👉 Reactivar (quitar finalizada)
                    # La temporada NO debe estar finalizada para reactivar una cosecha
                    if c.temporada.finalizada:
                        return self.notify(
                            key="cosecha_temporada_finalizada_no_restaurar",
                            data={"info": "No puedes reactivar una cosecha cuya temporada está finalizada."},
                            status_code=status.HTTP_400_BAD_REQUEST,
                        )

                    # Regla de negocio: solo una cosecha activa/no finalizada por temporada
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
            # Cualquier error: respuesta uniforme de error (sin 500)
            return self.notify(
                key="operacion_atomica_fallida",
                data={"info": "No se pudo completar la operación."},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"], url_path="reactivar")
    def reactivar(self, request, pk=None):
        # Alias compatible con UI: usa toggle
        return self.toggle_finalizada(request, pk)
