from django.db import transaction
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth.models import Permission

from agroproductores_risol.utils.pagination import GenericPagination
from gestion_usuarios.permissions import IsAdmin, IsSelfOrAdmin
from gestion_usuarios.models import Users, RegistroActividad
from gestion_usuarios.utils.activity import registrar_actividad
from gestion_usuarios.utils.notification_handler import NotificationHandler
from gestion_usuarios.utils.throttles import (
    LoginThrottle,
    SensitiveActionThrottle,
    PermissionsThrottle,
    AdminOnlyThrottle,
)
from gestion_usuarios.serializers import (
    UsuarioSerializer,
    LoginSerializer,
    CustomUserCreationSerializer,
    PermisoSerializer,
    RegistroActividadSerializer,
)

# --------------------------------------------------------------------------- #
#                                HELPERS                                      #
# --------------------------------------------------------------------------- #

def _to_plain(codenames_or_dotted):
    """
    Acepta lista de codenames 'app.codename' o 'codename' y devuelve solo planos.
    """
    plains = []
    for p in codenames_or_dotted:
        if not p:
            continue
        plains.append(p.split('.', 1)[1] if '.' in p else p)
    return plains

# Mapeo legible por módulo/entidad (solo etiqueta visual).
_MODEL_LABELS = {
    # dominio principal
    'huerta': 'Huertas',
    'huertarentada': 'Huertas rentadas',
    'temporada': 'Temporadas',
    'cosecha': 'Cosechas',
    'inversioneshuerta': 'Inversiones',          # 👈 FIX
    'venta': 'Ventas',
    'categoriainversion': 'Categorías de inversión',
    'propietario': 'Propietarios',
    # gestión de usuarios (si algún permiso se expone)
    'users': 'Usuarios',
    'registroactividad': 'Registro de actividad',
    'permission': 'Permisos del sistema',
}

_ACTION_LABELS = {
    'view': 'Ver',
    'add': 'Crear',
    'change': 'Editar',
    'delete': 'Eliminar',
    'archive': 'Archivar',
    'restore': 'Restaurar',
    'finalize': 'Finalizar',
    'reactivate': 'Reactivar',                   # 👈 FIX
}

def _friendly_name_from_codename(codename: str, model_label: str) -> str:
    """
    Genera un nombre legible: 'Ver huertas', 'Finalizar temporada', etc.
    """
    try:
        action, *_ = codename.split('_', 1)
    except ValueError:
        action = codename
    verb = _ACTION_LABELS.get(action, action.capitalize())
    return f"{verb} {model_label.lower()}"

def _catalog_queryset():
    """
    Devuelve queryset de permisos relevantes (dominio + usuarios si quieres mostrarlos).
    Si quisieras limitarlo más, ajusta el filtro de content_type.model aquí.
    """
    ct_allowed = list(_MODEL_LABELS.keys())
    return Permission.objects.select_related('content_type').filter(
        content_type__model__in=ct_allowed
    ).order_by('content_type__model', 'codename')

# --------------------------------------------------------------------------- #
#                                 AUTH VIEWS                                  #
# --------------------------------------------------------------------------- #
class LoginView(APIView):
    permission_classes = [AllowAny]              # 👈 FIX (no dejar [])
    throttle_classes = [LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)
        tokens = {"access": str(refresh.access_token), "refresh": str(refresh)}

        registrar_actividad(
            user,
            "Inicio de sesión",
            "Login exitoso",
            request.META.get("REMOTE_ADDR"),
        )

        return NotificationHandler.generate_response(
            message_key="login_success",
            data={
                "tokens": tokens,
                "user": UsuarioSerializer(user).data,
                "must_change_password": user.must_change_password,
            },
            status_code=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh_token")
            if refresh_token:
                RefreshToken(refresh_token).blacklist()
        except Exception:
            pass

        return NotificationHandler.generate_response(message_key="logout_success")


class CustomTokenRefreshView(TokenRefreshView):
    throttle_classes = []  # configura si deseas rate limit aquí


# --------------------------------------------------------------------------- #
#                              PERMISOS & LOGS                                #
# --------------------------------------------------------------------------- #
class PermisoViewSet(ReadOnlyModelViewSet):
    """
    Catálogo crudo de Django (poco usado por el frontend). Restringido a admin.
    """
    queryset = Permission.objects.all().order_by("name")
    serializer_class = PermisoSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    throttle_classes = [PermissionsThrottle]
    pagination_class = None


class RegistroActividadViewSet(viewsets.ModelViewSet):
    queryset = RegistroActividad.objects.all()
    serializer_class = RegistroActividadSerializer
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    search_fields = ["accion", "detalles", "ip", "usuario__telefono"]
    ordering_fields = ["fecha_hora"]
    ordering = ["-fecha_hora"]
    permission_classes = [IsAuthenticated, IsAdmin]
    throttle_classes = [AdminOnlyThrottle]
    pagination_class = GenericPagination  # 👈 asegura meta consistente

    def get_queryset(self):
        # Nota: si quieres ver también actividades del admin, elimina este exclude.
        return (
            RegistroActividad.objects.select_related("usuario")
            .exclude(usuario__role="admin")
            .order_by("-fecha_hora")
        )

    # 👇 respuesta consistente con NotificationHandler
    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            meta = {
                "count": self.paginator.page.paginator.count,
                "next": self.paginator.get_next_link(),
                "previous": self.paginator.get_previous_link(),
            }
            return NotificationHandler.generate_response(
                message_key="silent_response",  # evita toast en FE
                data={"results": serializer.data, "meta": meta},
                status_code=status.HTTP_200_OK,
            )

        serializer = self.get_serializer(qs, many=True)
        meta = {"count": len(serializer.data), "next": None, "previous": None}
        return NotificationHandler.generate_response(
            message_key="silent_response",
            data={"results": serializer.data, "meta": meta},
            status_code=status.HTTP_200_OK,
        )


# --------------------------------------------------------------------------- #
#                             USUARIO CRUD VIEWSET                            #
# --------------------------------------------------------------------------- #
class UsuarioViewSet(ModelViewSet):
    queryset = Users.objects.all().order_by('-id')
    serializer_class = UsuarioSerializer
    pagination_class = GenericPagination

    # ───────────────────── permisos dinámicos ──────────────────────
    def get_permissions(self):
        if self.action == "list":
            return [IsAuthenticated(), IsAdmin()]
        if self.action in ("retrieve", "update", "partial_update"):
            return [IsAuthenticated(), IsSelfOrAdmin()]
        if self.action == "destroy":
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    # ───────────────────── serializer dinámico ─────────────────────
    def get_serializer_class(self):
        return CustomUserCreationSerializer if self.action == "create" else UsuarioSerializer

    # 👇 lista con contrato consistente para el FE
    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())

        # Filtro por estado (activos | archivados | todos)
        estado = request.query_params.get('estado')
        if estado == 'activos':
            qs = qs.filter(archivado_en__isnull=True)
        elif estado == 'archivados':
            qs = qs.filter(archivado_en__isnull=False)

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            meta = {
                "count": self.paginator.page.paginator.count,
                "next": self.paginator.get_next_link(),
                "previous": self.paginator.get_previous_link(),
            }
            return NotificationHandler.generate_response(
                message_key="silent_response",
                data={"results": serializer.data, "meta": meta},
                status_code=status.HTTP_200_OK,
            )

        serializer = self.get_serializer(qs, many=True)
        meta = {"count": len(serializer.data), "next": None, "previous": None}
        return NotificationHandler.generate_response(
            message_key="silent_response",
            data={"results": serializer.data, "meta": meta},
            status_code=status.HTTP_200_OK,
        )

    # ──────────────────── ACCIONES PERSONALIZADAS ──────────────────
    # ---------- set-permisos ----------
    @action(
        detail=True,
        methods=["patch"],
        permission_classes=[IsAuthenticated, IsAdmin],
        throttle_classes=[SensitiveActionThrottle],
        url_path="set-permisos",
    )
    def set_permisos(self, request, pk=None):
        user_obj = self.get_object()

        # Evitar que un admin no superuser se edite sus propios permisos
        if user_obj == request.user and not request.user.is_superuser:
            return NotificationHandler.generate_response(
                message_key="permission_denied",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        codenames = request.data.get("permisos", [])
        if not isinstance(codenames, list):
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": {"permisos": ["Debe ser una lista de codenames."]}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # Validar existencia y colisiones por codename
        plains = list(set(_to_plain(codenames)))
        qs = Permission.objects.filter(codename__in=plains)

        found_map = {}
        for perm in qs.select_related('content_type'):
            found_map.setdefault(perm.codename, []).append(perm)

        missing = [c for c in plains if c not in found_map]
        collisions = {c: v for c, v in found_map.items() if len(v) > 1}

        if missing or collisions:
            detail = {
                "missing": missing,
                "collisions": {
                    k: [
                        {
                            "id": p.id,
                            "app_label": p.content_type.app_label,
                            "model": p.content_type.model,
                            "name": p.name,
                        }
                        for p in v
                    ]
                    for k, v in collisions.items()
                },
            }
            return NotificationHandler.generate_response(
                message_key="invalid_permissions",
                data=detail,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Asignación directa de user_permissions (los grupos quedan intactos)
            permisos = [found_map[c][0] for c in plains]
            user_obj.user_permissions.set(permisos)

        registrar_actividad(request.user, f"Actualizó permisos de usuario {user_obj.id}")

        return NotificationHandler.generate_response(
            message_key="permission_update_success",
            data={"user": UsuarioSerializer(user_obj).data},
        )

    # ---------- ARCHIVAR ----------
    @action(
        detail=True,
        methods=["patch"],
        permission_classes=[IsAuthenticated, IsAdmin],
        throttle_classes=[SensitiveActionThrottle],
        url_path="archivar",
    )
    def archivar_usuario(self, request, pk=None):
        user = self.get_object()

        if user.archivado_en:
            return NotificationHandler.generate_response(
                message_key="usuario_ya_archivado",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        user.archivar()
        registrar_actividad(request.user, f"Archivó usuario {user.id}")

        return NotificationHandler.generate_response(
            message_key="usuario_archivado",
            data={"user": UsuarioSerializer(user).data},
        )

    # ---------- RESTAURAR ----------
    @action(
        detail=True,
        methods=["patch"],
        permission_classes=[IsAuthenticated, IsAdmin],
        throttle_classes=[SensitiveActionThrottle],
        url_path="restaurar",
    )
    def restaurar_usuario(self, request, pk=None):
        user = self.get_object()

        if not user.archivado_en:          # ya activo
            return NotificationHandler.generate_response(
                message_key="usuario_no_archivado",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        user.desarchivar()
        registrar_actividad(request.user, f"Restauró usuario {user.id}")

        return NotificationHandler.generate_response(
            message_key="usuario_restaurado",
            data={"user": UsuarioSerializer(user).data},
        )

    # ---------- CREATE ----------
    def create(self, request, *args, **kwargs):
        serializer = CustomUserCreationSerializer(data=request.data)
        if not serializer.is_valid():
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": serializer.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        user = serializer.save()
        registrar_actividad(request.user, f"Registró al usuario: {user.telefono}")

        return NotificationHandler.generate_response(
            message_key="register_success",
            data=UsuarioSerializer(user).data,
            status_code=status.HTTP_201_CREATED,
        )

    # ---------- TOGGLE ACTIVE (solo para admins; NO afecta archivado) ----------
    @action(
        detail=True,
        methods=["patch"],
        permission_classes=[IsAuthenticated, IsAdmin],
        throttle_classes=[SensitiveActionThrottle],
    )
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])

        registrar_actividad(
            request.user,
            f"{'Activó' if user.is_active else 'Desactivó'} usuario {user.id}",
        )

        return NotificationHandler.generate_response(
            message_key="update_success",
            data={"user": UsuarioSerializer(user).data},
        )

    # ---------- DELETE ----------
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        # Sólo si está archivado y sin historial
        if instance.is_active or instance.archivado_en is None:
            return NotificationHandler.generate_response(
                message_key="usuario_no_archivado",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if RegistroActividad.objects.filter(usuario=instance).exists():
            return NotificationHandler.generate_response(
                message_key="usuario_con_historial",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        self.perform_destroy(instance)
        registrar_actividad(request.user, f"Eliminó usuario {instance.id}")

        return NotificationHandler.generate_response(message_key="delete_success")

    def get_queryset(self):
        estado = self.request.query_params.get('estado')  # activos | archivados | todos
        queryset = super().get_queryset()

        if estado == 'activos':
            queryset = queryset.filter(archivado_en__isnull=True)
        elif estado == 'archivados':
            queryset = queryset.filter(archivado_en__isnull=False)

        return queryset


# --------------------------------------------------------------------------- #
#                            UTILIDADES ADICIONALES                           #
# --------------------------------------------------------------------------- #
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [SensitiveActionThrottle]

    def post(self, request):
        new_password = request.data.get("new_password")
        confirm_password = request.data.get("confirm_password")

        if not new_password or not confirm_password or len(new_password) < 4:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={
                    "errors": {
                        "new_password": ["La contraseña debe tener al menos 4 caracteres."],
                        "confirm_password": ["Campo requerido."],
                    }
                },
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if new_password != confirm_password:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": {"confirm_password": ["Las contraseñas no coinciden."]}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        if user.check_password(new_password):
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": {"new_password": ["No se puede reutilizar la misma contraseña."]}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.must_change_password = False
        user.save()

        registrar_actividad(user, "Cambio de contraseña", detalles="El usuario cambió su contraseña.")

        return NotificationHandler.generate_response(message_key="password_change_success")


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UsuarioSerializer(request.user).data)


class UserPermissionsView(APIView):
    """
    Devuelve el set de permisos del usuario AUTENTICADO en formato plano (sin 'app.').
    Respeta permisos por grupo (usa get_all_permissions()).
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [PermissionsThrottle]

    def get(self, request):
        dotted = list(request.user.get_all_permissions())
        plains = _to_plain(dotted)
        return Response({"permissions": plains})


class PermisosFiltradosView(APIView):
    """
    Catálogo DINÁMICO de permisos relevantes, agrupados y traducidos para el frontend.
    Solo accesible para administradores.
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    throttle_classes = [PermissionsThrottle]

    def get(self, request):
        permisos = []
        for perm in _catalog_queryset():
            model = perm.content_type.model  # ej: 'huertarentada'
            modulo = _MODEL_LABELS.get(model, model.capitalize())
            nombre = _friendly_name_from_codename(perm.codename, modulo)
            permisos.append({
                'codename': perm.codename,   # plano real de BD
                'nombre': nombre,           # 'Ver huertas', etc.
                'modulo': modulo,           # 'Huertas'
            })
        return Response(permisos)
