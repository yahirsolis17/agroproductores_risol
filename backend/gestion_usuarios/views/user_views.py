from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import Permission
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import UserRateThrottle
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from gestion_usuarios.permissions import IsAdmin, IsSelfOrAdmin
from gestion_usuarios.models import Users, RegistroActividad
from gestion_usuarios.utils.activity import registrar_actividad
from gestion_usuarios.utils.notification_handler import NotificationHandler
from rest_framework.viewsets import ModelViewSet
from gestion_usuarios.utils.audit import AuditMixin, AuditUpdateMixin
from gestion_usuarios.serializers import RegistroActividadSerializer
from rest_framework.permissions import IsAdminUser
from rest_framework.generics import ListAPIView
from rest_framework.decorators import action
from rest_framework.decorators import api_view, permission_classes
from django.shortcuts import redirect
from django.contrib.auth.hashers import make_password
from rest_framework import viewsets, filters
from django.contrib.auth.models import Permission
from rest_framework.viewsets import ReadOnlyModelViewSet
from gestion_usuarios.serializers import (
    UsuarioSerializer,
    LoginSerializer,
    CustomUserCreationSerializer,
    PermisoSerializer,
    RegistroActividadSerializer,
)

class LoginThrottle(UserRateThrottle):
    rate = '5/min'

# gestion_usuarios/views/user_views.py
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes   = [LoginThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']

        # --- GENERAR TOKENS SIEMPRE ---
        refresh = RefreshToken.for_user(user)
        tokens  = {
            'access':  str(refresh.access_token),
            'refresh': str(refresh),
        }

        # Registrar actividad
        ip         = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT')
        registrar_actividad(user, "Inicio de sesión", "Login exitoso", ip, user_agent)

        return NotificationHandler.generate_response(
            message_key="login_success",
            data={
                'tokens': tokens,
                'user':  UsuarioSerializer(user).data,
                'must_change_password': user.must_change_password
            },
            status_code=status.HTTP_200_OK
        )

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh_token")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            pass  # no lanzar error, simplemente continuar

        return NotificationHandler.generate_response(
            message_key="logout_success"
        )

class PermisoViewSet(ReadOnlyModelViewSet):
    """
    Lee todos los permisos de Django.
    """
    queryset           = Permission.objects.all().order_by('name')
    serializer_class   = PermisoSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class   = None



class RefreshTokenThrottle(UserRateThrottle):
    scope = 'refresh_token'
    
class CustomTokenRefreshView(TokenRefreshView):
    throttle_classes = [RefreshTokenThrottle]

class UsuarioViewSet(AuditUpdateMixin, ModelViewSet):
    queryset = Users.objects.all()
    serializer_class = UsuarioSerializer

    # ----- permisos por acción -----
    def get_permissions(self):
        if self.action == 'list':
            return [IsAuthenticated(), IsAdmin()]
        if self.action in ('retrieve', 'update', 'partial_update'):
            return [IsAuthenticated(), IsSelfOrAdmin()]
        if self.action == 'destroy':
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    # ----- serializer dinámico -----
    def get_serializer_class(self):
        if self.action == 'create':
            return CustomUserCreationSerializer
        return UsuarioSerializer

    # ----- asignar permisos -----
    @action(detail=True, methods=['patch'], permission_classes=[IsAdmin], url_path='set-permisos')
    def set_permisos(self, request, pk=None):
        user_obj = self.get_object()

        # evita que un admin sin superuser se quite sus propios permisos
        if user_obj == request.user and not request.user.is_superuser:
            return NotificationHandler.generate_response(
                message_key="permission_denied",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        codenames = request.data.get('permisos', [])
        permisos = Permission.objects.filter(codename__in=codenames)
        user_obj.user_permissions.set(permisos)

        registrar_actividad(request.user, f"Actualizó permisos de usuario {user_obj.id}")

        return NotificationHandler.generate_response(
            message_key="permission_update_success",
            data={"user": UsuarioSerializer(user_obj).data}
        )

    # ----- creación personalizada -----
    def create(self, request, *args, **kwargs):
        serializer = CustomUserCreationSerializer(data=request.data)
        if not serializer.is_valid():
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={'errors': serializer.errors},
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        user = serializer.save()
        registrar_actividad(request.user, f"Registró al usuario: {user.telefono}")

        return NotificationHandler.generate_response(
            message_key="register_success",
            data=UsuarioSerializer(user).data,
            status_code=status.HTTP_201_CREATED,
        )

    # ----- activar/desactivar -----
    @action(detail=True, methods=['patch'], permission_classes=[IsAdmin])
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()

        registrar_actividad(request.user, f"{'Activó' if user.is_active else 'Desactivó'} usuario {user.id}")

        return NotificationHandler.generate_response(
            message_key="update_success",
            data={"user": UsuarioSerializer(user).data}
        )

    # ----- eliminar usuario con notificación -----
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)

        registrar_actividad(request.user, f"Eliminó usuario {instance.id}")

        return NotificationHandler.generate_response(
            message_key="delete_success"
        )

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')
        
        # Corregido: se valida que la nueva contraseña tenga al menos 4 caracteres.
        if not new_password or not confirm_password or len(new_password) < 4:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={
                    "errors": {
                        "new_password": ["La contraseña debe tener al menos 4 caracteres."],
                        "confirm_password": ["Campo requerido."]
                    }
                },
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Validar que ambas contraseñas coincidan.
        if new_password != confirm_password:
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": {"confirm_password": ["Las contraseñas no coinciden."]}},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        user = request.user
        
        # Validar que la nueva contraseña no sea igual a la actual.
        if user.check_password(new_password):
            return NotificationHandler.generate_response(
                message_key="validation_error",
                data={"errors": {"new_password": ["No se puede reutilizar la misma contraseña."]}},
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # Actualizar la contraseña y eliminar el flag de cambio obligatorio.
        user.set_password(new_password)
        user.must_change_password = False
        user.save()

        registrar_actividad(user, "Cambio de contraseña", detalles="El usuario cambió su contraseña.")

        return NotificationHandler.generate_response(
            message_key="password_change_success"
        )


class AuditedModelViewSet(ModelViewSet, AuditMixin):
    def perform_create(self, serializer):
        instance = serializer.save()
        self.audit(self.request, self.request.user, "Creación", f"Se creó {instance}")
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        self.audit(self.request, self.request.user, "Actualización", f"Se modificó {instance}")
        return instance

    def perform_destroy(self, instance):
        self.audit(self.request, self.request.user, "Eliminación", f"Se eliminó {instance}")
        instance.delete()


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UsuarioSerializer(request.user)
        return Response(serializer.data)

class UserPermissionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        perms = request.user.get_all_permissions()
        return Response({"permissions": list(perms)})

class RegistroActividadViewSet(viewsets.ModelViewSet):
    queryset = RegistroActividad.objects.all()
    serializer_class = RegistroActividadSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['fecha_hora']
    ordering = ['-fecha_hora']

    def get_queryset(self):
        return RegistroActividad.objects.select_related('usuario') \
            .exclude(usuario__role='admin') \
            .order_by('-fecha_hora')
