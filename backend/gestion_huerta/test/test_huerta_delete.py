from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model
from gestion_huerta.models import Propietario, Huerta, Temporada


class HuertaDeleteValidationTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.admin = User.objects.create_user(
            telefono='9990001111',
            password='adminpass',
            nombre='Admin',
            apellido='User',
            role='admin'
        )
        self.client.force_authenticate(user=self.admin)

        self.propietario = Propietario.objects.create(
            nombre='Juan',
            apellidos='Pérez',
            telefono='1234567890',
            direccion='Calle 1'
        )
        self.huerta = Huerta.objects.create(
            nombre='Mi huerta',
            ubicacion='Ubicación',
            variedades='Tomate',
            hectareas=1.0,
            propietario=self.propietario,
            is_active=False
        )
        Temporada.objects.create(año=2024, huerta=self.huerta)

    def test_huerta_with_temporadas_cannot_be_deleted(self):
        url = reverse('huerta:huerta-detail', args=[self.huerta.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Huerta.objects.filter(id=self.huerta.id).exists())

