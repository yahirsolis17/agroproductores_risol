from rest_framework.test import APITestCase
from django.urls import reverse
from gestion_usuarios.models import Users

class ChangePasswordTests(APITestCase):
    def setUp(self):
        # Usuario con must_change_password=True
        self.user = Users.objects.create_user(
            telefono='5550000001',
            password='oldpass',
            nombre='Test',
            apellido='User'
        )
        self.user.must_change_password = True
        self.user.save()
        # Autenticamos usando tu LoginView
        login_resp = self.client.post(
            reverse('gestion_usuarios:login'),
            {'telefono': '5550000001', 'password': 'oldpass'}
        ).data
        token = login_resp['data']['tokens']['access']
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        self.url = reverse('gestion_usuarios:change-password')

    def test_change_password_success(self):
        resp = self.client.post(self.url, {
            'new_password': 'new1234',
            'confirm_password': 'new1234'
        })
        self.assertEqual(resp.status_code, 200)
        self.user.refresh_from_db()
        self.assertFalse(self.user.must_change_password)

    def test_change_password_mismatch(self):
        resp = self.client.post(self.url, {
            'new_password': 'aaa',
            'confirm_password': 'bbb'
        })
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(resp.data['success'])
        errors = resp.data['data']['errors']
        self.assertIn('confirm_password', errors)

    def test_reuse_old_password(self):
        resp = self.client.post(self.url, {
            'new_password': 'oldpass',
            'confirm_password': 'oldpass'
        })
        self.assertEqual(resp.status_code, 400)
        errors = resp.data['data']['errors']
        self.assertIn('new_password', errors)
