import re
import time

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import Permission
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import RegistroActividad, Users
from .utils.activity import registrar_actividad
from .validators import validate_telefono


LOGIN_LOCK_THRESHOLD = 5
LOGIN_LOCK_WINDOW_SECONDS = 5 * 60
INVALID_CREDENTIALS_MESSAGE = "Credenciales invalidas. Verifica tu telefono y contrasena."
PASSWORD_POLICY_MESSAGE = "La contrasena debe tener al menos 8 caracteres e incluir letras y numeros."


def _login_fail_key(telefono: str, remote_addr: str) -> str:
    return f"auth:login:fail:{telefono}:{remote_addr}"


def _login_lock_key(telefono: str, remote_addr: str) -> str:
    return f"auth:login:lock:{telefono}:{remote_addr}"


def validate_password_strength(password: str, *, user: Users | None = None) -> str:
    value = str(password or "")
    if len(value) < 8 or not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
        raise serializers.ValidationError(PASSWORD_POLICY_MESSAGE)
    try:
        validate_password(value, user=user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(list(exc.messages)) from exc
    return value


class LoginSerializer(serializers.Serializer):
    telefono = serializers.CharField(max_length=10)
    password = serializers.CharField(write_only=True, min_length=2)

    def validate_telefono(self, value):
        return validate_telefono(value)

    def validate(self, data):
        telefono = data["telefono"]
        request = self.context.get("request")
        remote_addr = request.META.get("REMOTE_ADDR", "unknown") if request else "unknown"
        fail_key = _login_fail_key(telefono, remote_addr)
        lock_key = _login_lock_key(telefono, remote_addr)

        user = Users.objects.filter(telefono=telefono).first()
        if not user:
            raise serializers.ValidationError({"telefono": INVALID_CREDENTIALS_MESSAGE})

        if not user.is_active:
            registrar_actividad(
                user,
                "Intento de inicio de sesion denegado",
                detalles="motivo=usuario_inactivo",
                ip=remote_addr,
            )
            raise serializers.ValidationError({"telefono": "La cuenta asociada a este telefono esta deshabilitada."})

        lock_until = cache.get(lock_key)
        now = time.time()
        if isinstance(lock_until, (int, float)) and lock_until > now:
            remaining_seconds = max(1, int(lock_until - now))
            remaining_minutes = max(1, (remaining_seconds + 59) // 60)
            registrar_actividad(
                user,
                "Intento de inicio de sesion bloqueado",
                detalles=f"motivo=bloqueo_temporal; restante_segundos={remaining_seconds}",
                ip=remote_addr,
            )
            raise serializers.ValidationError(
                {
                    "telefono": (
                        "Demasiados intentos fallidos. "
                        f"Intenta nuevamente en {remaining_minutes} minuto(s)."
                    )
                }
            )

        user_auth = authenticate(
            request=request,
            username=telefono,
            password=data["password"],
        )

        if not user_auth:
            failed_attempts = int(cache.get(fail_key, 0) or 0) + 1
            cache.set(fail_key, failed_attempts, LOGIN_LOCK_WINDOW_SECONDS)

            user.intentos_fallidos = failed_attempts
            user.save(update_fields=["intentos_fallidos"])
            registrar_actividad(
                user,
                "Intento de inicio de sesion fallido",
                detalles=f"motivo=password_incorrecta; intentos_fallidos={failed_attempts}",
                ip=remote_addr,
            )

            if failed_attempts >= LOGIN_LOCK_THRESHOLD:
                lock_until = now + LOGIN_LOCK_WINDOW_SECONDS
                cache.set(lock_key, lock_until, LOGIN_LOCK_WINDOW_SECONDS)
                cache.delete(fail_key)
                registrar_actividad(
                    user,
                    "Bloqueo temporal de inicio de sesion",
                    detalles=f"motivo=umbral_superado; ventana_segundos={LOGIN_LOCK_WINDOW_SECONDS}",
                    ip=remote_addr,
                )
                raise serializers.ValidationError(
                    {
                        "telefono": (
                            "Demasiados intentos fallidos. "
                            "Intenta nuevamente en 5 minuto(s)."
                        )
                    }
                )

            raise serializers.ValidationError({"telefono": INVALID_CREDENTIALS_MESSAGE})

        user.intentos_fallidos = 0
        user.save(update_fields=["intentos_fallidos"])
        cache.delete(fail_key)
        cache.delete(lock_key)
        data["user"] = user
        data["must_change_password"] = user.must_change_password
        return data


class CustomUserCreationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = Users
        fields = ("telefono", "nombre", "apellido", "role", "password")

    def validate_telefono(self, value):
        if not re.fullmatch(r"\d{10}", value):
            raise serializers.ValidationError("El telefono debe contener exactamente 10 digitos numericos.")
        if Users.objects.filter(telefono=value).exists():
            raise serializers.ValidationError("El telefono ya esta registrado.")
        return value

    def validate_nombre(self, value):
        v = value.strip()
        if not re.fullmatch(r"[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{3,100}", v):
            raise serializers.ValidationError("Nombre invalido. Solo letras, minimo 3 caracteres.")
        return v

    def validate_apellido(self, value):
        v = value.strip()
        if not re.fullmatch(r"[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{3,100}", v):
            raise serializers.ValidationError("Apellido invalido. Solo letras, minimo 3 caracteres.")
        return v

    def validate_role(self, value):
        if value not in ("admin", "usuario"):
            raise serializers.ValidationError("Rol invalido. Debe ser 'admin' o 'usuario'.")
        return value

    def validate_password(self, value):
        return validate_password_strength(value)

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = Users(**validated_data)
        user.set_password(password)
        user.must_change_password = True
        user.save()
        return user


class UsuarioSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField(source="get_full_name")
    is_admin = serializers.ReadOnlyField()
    role = serializers.CharField(read_only=True)
    archivado_en = serializers.DateTimeField(read_only=True)
    permisos = serializers.SlugRelatedField(
        many=True,
        read_only=True,
        slug_field="codename",
        source="user_permissions",
    )

    class Meta:
        model = Users
        fields = [
            "id",
            "telefono",
            "nombre",
            "apellido",
            "password",
            "is_staff",
            "is_admin",
            "is_active",
            "archivado_en",
            "role",
            "full_name",
            "permisos",
            "must_change_password",
        ]
        extra_kwargs = {"password": {"write_only": True}}


class RegistroActividadSerializer(serializers.ModelSerializer):
    usuario = UsuarioSerializer()
    categoria = serializers.SerializerMethodField()
    severidad = serializers.SerializerMethodField()
    ruta = serializers.SerializerMethodField()
    metodo = serializers.SerializerMethodField()
    es_denegado = serializers.SerializerMethodField()

    @staticmethod
    def _normalized(instance) -> tuple[str, str]:
        accion = (instance.accion or "").lower()
        detalles = (instance.detalles or "").lower()
        return accion, detalles

    def get_categoria(self, instance):
        accion, detalles = self._normalized(instance)
        if "denegado" in accion or "bloqueado" in accion or "permiso_requerido=" in detalles:
            return "seguridad"
        if "sesion" in accion or "login" in accion or "contrase" in accion:
            return "autenticacion"
        if any(token in accion or token in detalles for token in ("huerta", "cosecha", "temporada", "venta", "inversion", "propietario")):
            return "gestion_huerta"
        if any(token in accion or token in detalles for token in ("bodega", "recepcion", "camion", "madera", "consumible", "empaque", "semana")):
            return "gestion_bodega"
        if "usuario" in accion or "permiso" in accion:
            return "gestion_usuarios"
        return "sistema"

    def get_severidad(self, instance):
        accion, detalles = self._normalized(instance)
        if "denegado" in accion or "fallido" in accion or "bloque" in accion:
            return "warning"
        if any(token in accion or token in detalles for token in ("elim", "archiv", "restaur", "finaliz", "reactiv")):
            return "info"
        return "success"

    def get_ruta(self, instance):
        detalles = instance.detalles or ""
        for part in detalles.split(";"):
            part = part.strip()
            if part.startswith("ruta="):
                return part.split("=", 1)[1]
        return None

    def get_metodo(self, instance):
        detalles = instance.detalles or ""
        for part in detalles.split(";"):
            part = part.strip()
            if part.startswith("metodo="):
                return part.split("=", 1)[1]
        return None

    def get_es_denegado(self, instance):
        accion, detalles = self._normalized(instance)
        return "denegado" in accion or "permiso_requerido=" in detalles or "bloqueado" in accion

    class Meta:
        model = RegistroActividad
        fields = [
            "id",
            "usuario",
            "accion",
            "fecha_hora",
            "detalles",
            "ip",
            "categoria",
            "severidad",
            "ruta",
            "metodo",
            "es_denegado",
        ]


class PermisoSerializer(serializers.ModelSerializer):
    content_type = serializers.StringRelatedField()

    class Meta:
        model = Permission
        fields = ["id", "name", "codename", "content_type"]
