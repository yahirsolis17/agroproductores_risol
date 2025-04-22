# gestion_usuarios/tests/test_models.py
from django.test import TestCase
from gestion_usuarios.models import Users, RegistroActividad

class UsersModelTests(TestCase):
    def test_create_user_and_str(self):
        u = Users.objects.create_user(
            telefono='1112223333',
            password='p',
            nombre='Ana',
            apellido='Bel'
        )
        self.assertEqual(str(u), 'Ana Bel')
        self.assertFalse(u.is_admin)

    def test_create_superuser(self):
        su = Users.objects.create_superuser(
            telefono='9998887777',
            password='p',
            nombre='Admin',
            apellido='Root'
        )
        self.assertTrue(su.is_admin)
        self.assertTrue(su.is_superuser)

    def test_full_and_short_name(self):
        u = Users.objects.create_user(
            telefono='1231231234',
            password='p',
            nombre='Foo',
            apellido='Bar'
        )
        self.assertEqual(u.get_full_name(), 'Foo Bar')
        self.assertEqual(u.get_short_name(), 'Foo')

class RegistroActividadTests(TestCase):
    def test_registro_crea_instancia(self):
        u = Users.objects.create_user(
            telefono='2223334444',
            password='p',
            nombre='Tim',
            apellido='Lee'
        )
        ra = RegistroActividad.objects.create(
            usuario=u,
            accion='Prueba',
            detalles='Detalles de prueba'
        )
        self.assertEqual(RegistroActividad.objects.count(), 1)
        self.assertEqual(ra.accion, 'Prueba')
