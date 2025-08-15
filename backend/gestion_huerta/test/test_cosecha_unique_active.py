from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model

from gestion_huerta.models import Propietario, Huerta, Temporada, Cosecha
from gestion_huerta.utils.constants import NOTIFICATION_MESSAGES


class CosechaActiveConstraintTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            telefono='9999999999',
            password='pass',
            nombre='Admin',
            apellido='User',
            role='admin',
        )
        self.client.force_authenticate(self.user)

        self.propietario = Propietario.objects.create(
            nombre='Juan',
            apellidos='Pérez',
            telefono='1234567890',
            direccion='Calle 1',
        )
        self.huerta = Huerta.objects.create(
            nombre='Huerta 1',
            ubicacion='Ubic',
            variedades='Var',
            hectareas=1.0,
            propietario=self.propietario,
        )
        self.temporada = Temporada.objects.create(año=2024, huerta=self.huerta)
        self.cosecha = Cosecha.objects.create(nombre='C1', temporada=self.temporada, huerta=self.huerta)

    def test_prevent_second_active_cosecha(self):
        url = reverse('huerta:cosecha-list')
        payload = {
            'temporada': self.temporada.id,
            'nombre': 'Cosecha 2',
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('notification', response.data)
        self.assertEqual(response.data['notification']['key'], 'cosecha_activa_existente')
        self.assertEqual(
            response.data['notification']['message'],
            NOTIFICATION_MESSAGES['cosecha_activa_existente']['message'],
        )
        self.assertEqual(response.data['notification']['type'], 'error')

    def test_allow_creation_after_finalized(self):
        self.cosecha.finalizar()
        url = reverse('huerta:cosecha-list')
        payload = {
            'temporada': self.temporada.id,
            'nombre': 'Cosecha 2',
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)