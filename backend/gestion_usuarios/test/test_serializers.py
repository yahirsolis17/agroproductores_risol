# gestion_usuarios/tests/test_serializers.py
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from rest_framework import serializers
from gestion_usuarios.serializers import (
    CustomUserCreationSerializer,
    LoginSerializer
)

User = get_user_model()

class SerializersTests(APITestCase):
    def test_custom_user_creation_success(self):
        data = {
            'telefono': '1234567890',
            'nombre': 'Carlos',
            'apellido': 'Lopez',
            'role': 'usuario',
            'password': 'Carlos2026'
        }
        ser = CustomUserCreationSerializer(data=data)
        self.assertTrue(ser.is_valid(), ser.errors)
        u = ser.save()
        self.assertTrue(u.must_change_password)
        # Contraseña por defecto
        self.assertTrue(u.check_password('Carlos2026'))

    def test_custom_user_creation_invalid_role(self):
        ser = CustomUserCreationSerializer(data={
            'telefono': '0987654321',
            'nombre': 'Ana',
            'apellido': 'Perez',
            'role': 'manager',
            'password': 'Ana2026Pwd'
        })
        self.assertFalse(ser.is_valid())
        self.assertIn('role', ser.errors)

    def test_login_serializer_invalid_user(self):
        ser = LoginSerializer(data={'telefono': '0000000000', 'password': 'x'})
        with self.assertRaises(serializers.ValidationError):
            ser.is_valid(raise_exception=True)
