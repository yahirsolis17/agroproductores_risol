# gestion_usuarios/tests/test_user_crud.py  (reemplázalo completo)

from rest_framework.test import APITestCase
from django.urls import reverse
from rest_framework_simplejwt.tokens import RefreshToken
from gestion_usuarios.models import Users

class UserCRUDTests(APITestCase):
    def setUp(self):
        # Admin
        self.admin = Users.objects.create_superuser(
            telefono='5550000002', password='adminpass',
            nombre='Admin', apellido='Root'
        )

        # 1) Intentamos autenticarnos vía /usuarios/login/
        login = self.client.post(
            reverse('gestion_usuarios:login'),
            {'telefono': '5550000002', 'password': 'adminpass'}
        )

        if login.status_code == 200 and 'data' in login.data:
            access = login.data['data']['tokens']['access']
        else:
            # 2) Fallback: generamos el token manualmente
            access = str(RefreshToken.for_user(self.admin).access_token)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        self.list_url = reverse('gestion_usuarios:users-list')

    def test_create_user(self):
        data = {
            'telefono': '5550000003',
            'nombre': 'Nuevo',
            'apellido': 'Usuario',
            'role': 'usuario'
        }
        resp = self.client.post(self.list_url, data)
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(Users.objects.filter(telefono='5550000003').exists())

    def test_toggle_active(self):
        u = Users.objects.create_user(
            telefono='5550000004', password='p',
            nombre='T', apellido='U'
        )
        url = reverse('gestion_usuarios:users-toggle-active', args=[u.id])
        resp = self.client.patch(url)
        self.assertEqual(resp.status_code, 200)
        u.refresh_from_db()
        self.assertFalse(u.is_active)
