from rest_framework.test import APITestCase
from django.urls import reverse
from gestion_usuarios.models import Users

class LoginTests(APITestCase):
    def setUp(self):
        self.user = Users.objects.create_user(
            telefono='5550000000',
            password='pass1234',
            nombre='Test',
            apellido='User'
        )
        self.url = reverse('gestion_usuarios:login')  # /usuarios/login/

    def test_login_success(self):
        resp = self.client.post(self.url, {
            'telefono': '5550000000',
            'password': 'pass1234'
        })
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['success'])
        tokens = resp.data['data']['tokens']
        self.assertIn('access', tokens)
        self.assertIn('refresh', tokens)
        self.assertIn('user', resp.data['data'])
        self.assertIn('must_change_password', resp.data['data'])

    def test_login_wrong_password(self):
        resp = self.client.post(self.url, {
            'telefono': '5550000000',
            'password': 'wrongpass'
        })
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(resp.data['success'])
        self.assertIn('notification', resp.data)
        self.assertIn('errors', resp.data['data'])
