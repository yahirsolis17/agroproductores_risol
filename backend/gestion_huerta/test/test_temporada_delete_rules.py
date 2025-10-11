from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from gestion_huerta.models import Propietario, Huerta, Temporada


class TemporadaDeleteRulesTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            telefono="5550000000",
            password="secret",
            nombre="Test",
            apellido="User",
            role="admin",
        )
        self.client.force_authenticate(self.user)

        propietario = Propietario.objects.create(
            nombre="Juan",
            apellidos="Pérez",
            telefono="5551111111",
            direccion="Calle 1",
        )
        self.huerta = Huerta.objects.create(
            nombre="Huerta Norte",
            ubicacion="Zona 1",
            variedades="Ataulfo",
            hectareas=10,
            propietario=propietario,
        )
        self.temporada = Temporada.objects.create(año=2024, huerta=self.huerta)

    def _delete(self):
        url = reverse("huerta:temporada-detail", args=[self.temporada.id])
        return self.client.delete(url)

    def test_delete_requires_temporada_finalizada(self):
        # Debe estar archivada para llegar a la validación de finalización
        self.temporada.is_active = False
        self.temporada.save(update_fields=["is_active"])

        response = self._delete()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["notification"]["key"], "temporada_no_finalizada")

        # Ahora finalizarla y confirmar que sí se puede eliminar
        self.temporada.finalizada = True
        self.temporada.save(update_fields=["finalizada"])

        response = self._delete()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["notification"]["key"], "temporada_delete_success")
