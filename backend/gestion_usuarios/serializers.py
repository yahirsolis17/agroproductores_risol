# gestion_usuarios/serializers.py

from rest_framework import serializers
from django.contrib.auth import authenticate
import re
from django.contrib.auth.models import Permission
from .models import Users, RegistroActividad
from .validators import validate_telefono, validate_nombre
# Login
class LoginSerializer(serializers.Serializer):
    telefono = serializers.CharField(max_length=10)
    password = serializers.CharField(write_only=True, min_length=2)

    def validate_telefono(self, value):
        return validate_telefono(value)

    def validate(self, data):
        user = Users.objects.filter(telefono=data['telefono']).first()
        if not user:
            raise serializers.ValidationError({"telefono": "El teléfono ingresado no está registrado."})

        if not user.is_active:
            raise serializers.ValidationError({"telefono": "La cuenta asociada a este teléfono está deshabilitada."})

        if user.intentos_fallidos >= 5:
            raise serializers.ValidationError({"telefono": "Demasiados intentos fallidos. Intenta más tarde o contacta al administrador."})

        user_auth = authenticate(
            request=self.context.get('request'),
            username=data['telefono'],  # <- Django sigue usando 'username' internamente
            password=data['password']
        )

        if not user_auth:
            user.intentos_fallidos += 1
            user.save()
            raise serializers.ValidationError({"password": "La contraseña ingresada es incorrecta."})

        user.intentos_fallidos = 0
        user.save()
        data['user'] = user
        data['must_change_password'] = user.must_change_password
        return data


class CustomUserCreationSerializer(serializers.ModelSerializer):
    """
    • Ya no exigimos que el admin mande 'password'.
    • Creamos al usuario con contraseña predeterminada
      y must_change_password = True
    """
    class Meta:
        model = Users
        fields = ('telefono', 'nombre', 'apellido', 'role')

    def validate_telefono(self, value):
        # Debe ser exactamente 10 dígitos numéricos
        if not re.fullmatch(r'\d{10}', value):
            raise serializers.ValidationError("El teléfono debe contener exactamente 10 dígitos numéricos.")
        # No debe repetirse en la base de datos
        if Users.objects.filter(telefono=value).exists():
            raise serializers.ValidationError("El teléfono ya está registrado.")
        return value

    def validate_nombre(self, value):
        # Solo letras (incluyendo tildes) y espacios, entre 3 y 100 caracteres
        v = value.strip()
        if not re.fullmatch(r'[a-zA-ZñÑáéíóúÁÉÍÓÚ\s]{3,100}', v):
            raise serializers.ValidationError(
                "Nombre inválido. Solo letras, mínimo 3 caracteres"
            )
        return v

    def validate_apellido(self, value):
        # Mismas reglas que para 'nombre'
        v = value.strip()
        if not re.fullmatch(r'[a-zA-ZñÑáéíóúÁÉÍÓÚ\s]{3,100}', v):
            raise serializers.ValidationError(
                "Apellido inválido. Solo letras, mínimo 3 caracteres."
            )
        return v

    def validate_role(self, value):
        # Debe ser 'admin' o 'usuario'
        if value not in ('admin', 'usuario'):
            raise serializers.ValidationError("Rol inválido. Debe ser 'admin' o 'usuario'.")
        return value

    def create(self, validated_data):
        # Asigna contraseña por defecto y obliga a cambio en primer login
        default_pwd = "12345678"
        user = Users(**validated_data)
        user.set_password(default_pwd)
        user.must_change_password = True
        user.save()
        return user




# Serializador general para mostrar usuarios
class UsuarioSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    is_admin  = serializers.ReadOnlyField()
    role      = serializers.CharField(read_only=True)

    class Meta:
        model  = Users
        fields = [
            'id', 'telefono', 'nombre', 'apellido',
            'password',          # ← write_only sigue aquí
            'is_staff', 'is_admin', 'is_active',
            'role',
            'full_name',
        ]
        extra_kwargs = {'password': {'write_only': True}}


# Para mostrar permisos
class UserPermissionsSerializer(serializers.ModelSerializer):
    content_type = serializers.StringRelatedField()

    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename', 'content_type']

# Serializador para logs
class RegistroActividadSerializer(serializers.ModelSerializer):
    usuario = UsuarioSerializer()

    class Meta:
        model = RegistroActividad
        fields = '__all__'

