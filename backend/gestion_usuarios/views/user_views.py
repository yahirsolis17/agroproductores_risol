from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import UserRateThrottle
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from gestion_usuarios.permissions import IsAdmin, IsSelfOrAdmin
from gestion_usuarios.models import Users, RegistroActividad
from gestion_usuarios.serializers import UsuarioSerializer, LoginSerializer, CustomUserCreationSerializer
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
            success=True,
            message_key="login_success",
            data={
                'tokens': tokens,
                'user':  UsuarioSerializer(user).data,
                'must_change_password': user.must_change_password
            },
            status_code=status.HTTP_200_OK
        )

        
class RefreshTokenThrottle(UserRateThrottle):
    scope = 'refresh_token'
    
class CustomTokenRefreshView(TokenRefreshView):
    throttle_classes = [RefreshTokenThrottle]

class UsuarioViewSet(AuditUpdateMixin, ModelViewSet):
    queryset = Users.objects.all()
    serializer_class = UsuarioSerializer

    def get_permissions(self):
        if self.action == 'list':
            return [IsAuthenticated(), IsAdmin()]
        elif self.action in ['retrieve', 'update', 'partial_update']:
            return [IsAuthenticated(), IsSelfOrAdmin()]
        elif self.action == 'destroy':
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CustomUserCreationSerializer
        return UsuarioSerializer
    
    @action(detail=True, methods=['patch'], permission_classes=[IsAdmin])
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        status_str = "activado" if user.is_active else "desactivado"
        self.audit(request, request.user, "Cambio de estado", f"{status_str} al usuario {user.telefono}")
        return Response({
            "success": True,
            "message": f"Usuario {status_str} correctamente.",
            "user": UsuarioSerializer(user).data
        }, status=status.HTTP_200_OK)

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Get the new password from the request data
        new_password = request.data.get('new_password')
        if not new_password or len(new_password) < 4:
            return Response({"error": "La contraseña debe tener al menos 4 caracteres."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        user.set_password(new_password)
        user.must_change_password = False
        user.save()

        # Log the password change activity
        registrar_actividad(user, "Cambio de contraseña", detalles="El usuario cambió su contraseña.")

        return Response({"success": True, "message": "Contraseña actualizada correctamente."})
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

class RegistroActividadListView(ListAPIView):
    queryset = RegistroActividad.objects.select_related('usuario').order_by('-fecha_hora')
    serializer_class = RegistroActividadSerializer
    permission_classes = [IsAdminUser]