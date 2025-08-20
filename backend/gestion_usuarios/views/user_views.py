from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth import authenticate
from django.contrib.auth.models import Permission
from agroproductores_risol.utils.pagination import GenericPagination
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

# --------------------------------------------------------------------------- #
#                                 AUTH VIEWS                                  #
# --------------------------------------------------------------------------- #
class LoginView(APIView):
    permission_classes = [AllowAny]

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
    pass  # throttle_classes = [RefreshTokenThrottle]  # Eliminado


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
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    search_fields = ["accion", "detalles", "ip", "usuario__telefono"]
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
        if not isinstance(codenames, (list, tuple)):
            codenames = [codenames]

        unique = {str(code) for code in codenames}
        permisos = Permission.objects.filter(codename__in=unique)
        valid = set(permisos.values_list("codename", flat=True))
        missing = sorted(unique - valid)
        if missing:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": {"permisos": [f"Permisos inválidos: {', '.join(missing)}"]}},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

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

    def get_queryset(self):
        estado = self.request.query_params.get('estado')  # activos | archivados | todos
        queryset = Users.objects.all()
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
        perms = {p.split(".")[-1] for p in request.user.get_all_permissions()}
        return Response({"permissions": sorted(perms)})


PERMISOS_RELEVANTES = {
    'Huertas': {
        'view_huerta': 'Ver huertas',
        'add_huerta': 'Crear huerta',
        'change_huerta': 'Editar huerta',
        'delete_huerta': 'Eliminar huerta',
        'archivar_huerta': 'Archivar huerta',
        'restaurar_huerta': 'Restaurar huerta',
    },
    'Huertas rentadas': {
        'view_huertarentada': 'Ver huertas rentadas',
        'add_huertarentada': 'Crear huerta rentada',
        'change_huertarentada': 'Editar huerta rentada',
        'delete_huertarentada': 'Eliminar huerta rentada',
        'archivar_huertarentada': 'Archivar huerta rentada',
        'restaurar_huertarentada': 'Restaurar huerta rentada',
    },
    'Temporadas': {
        'view_temporada': 'Ver temporadas',
        'add_temporada': 'Crear temporada',
        'change_temporada': 'Editar temporada',
        'delete_temporada': 'Eliminar temporada',
        'archivar_temporada': 'Archivar temporada',
        'restaurar_temporada': 'Restaurar temporada',
        'finalizar_temporada': 'Finalizar temporada',
        'reactivar_temporada': 'Reactivar temporada',
    },
    'Propietarios': {
        'view_propietario': 'Ver propietarios',
        'add_propietario': 'Crear propietario',
        'change_propietario': 'Editar propietario',
        'delete_propietario': 'Eliminar propietario',
        'archivar_propietario': 'Archivar propietario',
        'restaurar_propietario': 'Restaurar propietario',
    },
    'Cosechas': {
        'view_cosecha': 'Ver cosechas',
        'add_cosecha': 'Crear cosecha',
        'change_cosecha': 'Editar cosecha',
        'delete_cosecha': 'Eliminar cosecha',
        'archivar_cosecha': 'Archivar cosecha',
        'restaurar_cosecha': 'Restaurar cosecha',
        'finalizar_cosecha': 'Finalizar cosecha',
        'reactivar_cosecha': 'Reactivar cosecha',
    },
    'Inversiones': {
        'view_inversioneshuerta': 'Ver inversiones',
        'add_inversioneshuerta': 'Crear inversión',
        'change_inversioneshuerta': 'Editar inversión',
        'delete_inversioneshuerta': 'Eliminar inversión',
        'archivar_inversion': 'Archivar inversión',
        'restaurar_inversion': 'Restaurar inversión',
    },
    'Categorías inversión': {
        'view_categoriainversion': 'Ver categorías',
        'add_categoriainversion': 'Crear categoría',
        'change_categoriainversion': 'Editar categoría',
        'delete_categoriainversion': 'Eliminar categoría',
        'archivar_categoriainversion': 'Archivar categoría',
        'restaurar_categoriainversion': 'Restaurar categoría',
    },
    'Ventas': {
        'view_venta': 'Ver ventas',
        'add_venta': 'Crear venta',
        'change_venta': 'Editar venta',
        'delete_venta': 'Eliminar venta',
        'archivar_venta': 'Archivar venta',
        'restaurar_venta': 'Restaurar venta',
    },
    # Agrega aquí otros módulos relevantes si los tienes
}


class PermisosFiltradosView(APIView):
    """Return grouped permission codenames for the admin modal."""

    permission_classes = [IsAdmin]

    def get(self, request):
        permisos = []
        for modulo, perms in PERMISOS_RELEVANTES.items():
            for codename, nombre in perms.items():
                permisos.append({
                    "codename": codename,
                    "nombre": nombre,
                    "modulo": modulo,
                })
        return Response(permisos)
