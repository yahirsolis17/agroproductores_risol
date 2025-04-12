from rest_framework.test import APITestCase
from django.urls import reverse
from gestion_usuarios.models import Users

class UserAuthTests(APITestCase):
    def setUp(self):
        self.user = Users.objects.create_user(
            telefono='4433580000', nombre='Test', apellido='User', password='1234'
        )

    def test_login_success(self):
        response = self.client.post(reverse('login'), {'telefono': '4433580000', 'password': '1234'})
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data['data']['tokens'])

    def test_login_invalid_password(self):
        response = self.client.post(reverse('login'), {'telefono': '4433580000', 'password': 'wrong'})
        self.assertEqual(response.status_code, 400)

    def test_toggle_active(self):
        self.user.is_active = True
        self.user.save()
        self.client.force_authenticate(user=self.user)
        url = reverse('users-toggle-active', args=[self.user.id])
        response = self.client.patch(url)
        self.assertEqual(response.status_code, 403)  # No es admin

    def test_change_password(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(reverse('change-password'), {"password": "nueva123"})
        self.assertEqual(response.status_code, 200)

    def test_must_change_password_flag(self):
        self.user.must_change_password = True
        self.user.save()
        response = self.client.post(reverse('login'), {'telefono': '4433580000', 'password': '1234'})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['data']['must_change_password'])

