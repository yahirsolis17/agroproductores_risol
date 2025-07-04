from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework import status, viewsets, filters
from rest_framework.throttling import UserRateThrottle
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth import authenticate
from django.contrib.auth.models import Permission

from gestion_usuarios.permissions import IsAdmin, IsSelfOrAdmin
from gestion_usuarios.models import Users, RegistroActividad
from gestion_usuarios.utils.activity import registrar_actividad
from gestion_usuarios.utils.notification_handler import NotificationHandler
from gestion_usuarios.serializers import (
    UsuarioSerializer,
    LoginSerializer,
    CustomUserCreationSerializer,
    PermisoSerializer,
    RegistroActividadSerializer,
)

# ----- Throttles ------------------------------------------------------------
class LoginThrottle(UserRateThrottle):
    rate = "5/min"


class RefreshTokenThrottle(UserRateThrottle):
    scope = "refresh_token"


# --------------------------------------------------------------------------- #
#                                 AUTH VIEWS                                  #
# --------------------------------------------------------------------------- #
class LoginView(APIView):
    permission_classes = [AllowAny]
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
            request.META.get("HTTP_USER_AGENT"),
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
    throttle_classes = [RefreshTokenThrottle]


# --------------------------------------------------------------------------- #
#                              PERMISOS & LOGS                                #
# --------------------------------------------------------------------------- #
class PermisoViewSet(ReadOnlyModelViewSet):
    queryset = Permission.objects.all().order_by("name")
    serializer_class = PermisoSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = None


class RegistroActividadViewSet(viewsets.ModelViewSet):
    queryset = RegistroActividad.objects.all()
    serializer_class = RegistroActividadSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["fecha_hora"]
    ordering = ["-fecha_hora"]

    def get_queryset(self):
        # Excluimos actividad de super-admins para no saturar listados
        return (
            RegistroActividad.objects.select_related("usuario")
            .exclude(usuario__role="admin")
            .order_by("-fecha_hora")
        )


# --------------------------------------------------------------------------- #
#                             USUARIO CRUD VIEWSET                            #
# --------------------------------------------------------------------------- #
# gestion_usuarios/views/user_views.py  ➜  solo la clase UsuarioViewSet

class UsuarioViewSet(ModelViewSet):
    queryset = Users.objects.all()
    serializer_class = UsuarioSerializer

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

    # ──────────────────── ACCIONES PERSONALIZADAS ──────────────────
    # ---------- set-permisos ----------
    @action(detail=True, methods=["patch"], permission_classes=[IsAdmin], url_path="set-permisos")
    def set_permisos(self, request, pk=None):
        user_obj = self.get_object()

        if user_obj == request.user and not request.user.is_superuser:
            return NotificationHandler.generate_response(
                message_key="permission_denied",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        codenames = request.data.get("permisos", [])
        permisos = Permission.objects.filter(codename__in=codenames)
        user_obj.user_permissions.set(permisos)
        registrar_actividad(request.user, f"Actualizó permisos de usuario {user_obj.id}")

        return NotificationHandler.generate_response(
            message_key="permission_update_success",
            data={"user": UsuarioSerializer(user_obj).data},
        )

    # ---------- ARCHIVAR ----------
    @action(detail=True, methods=["patch"], permission_classes=[IsAdmin], url_path="archivar")
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
    @action(detail=True, methods=["patch"], permission_classes=[IsAdmin], url_path="restaurar")
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
    @action(detail=True, methods=["patch"], permission_classes=[IsAdmin])
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

# --------------------------------------------------------------------------- #
#                            UTILIDADES ADICIONALES                           #
# --------------------------------------------------------------------------- #
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"permissions": list(request.user.get_all_permissions())})
