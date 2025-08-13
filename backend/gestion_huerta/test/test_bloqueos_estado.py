from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.utils import timezone

from gestion_huerta.models import (
    Propietario,
    Huerta,
    Temporada,
    Cosecha,
    CategoriaInversion,
)


class BloqueosEstadoTests(APITestCase):
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
            telefono='1111111111',
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
        self.categoria = CategoriaInversion.objects.create(nombre='Cat')

    def _inversion_payload(self):
        return {
            'fecha': timezone.localdate().isoformat(),
            'descripcion': '',
            'gastos_insumos': '1',
            'gastos_mano_obra': '1',
            'categoria_id': self.categoria.id,
            'cosecha_id': self.cosecha.id,
            'temporada_id': self.temporada.id,
            'huerta_id': self.huerta.id,
        }

    def _venta_payload(self):
        return {
            'fecha_venta': timezone.localdate().isoformat(),
            'tipo_mango': 'Ataulfo',
            'num_cajas': 1,
            'precio_por_caja': '1',
            'gasto': '0',
            'cosecha_id': self.cosecha.id,
            'temporada_id': self.temporada.id,
            'huerta_id': self.huerta.id,
        }

    def _post_inversion(self):
        url = reverse('huerta:inversion-list')
        return self.client.post(url, self._inversion_payload(), format='json')

    def _post_venta(self):
        url = reverse('huerta:venta-list')
        return self.client.post(url, self._venta_payload(), format='json')

    def test_archived_huerta(self):
        self.huerta.is_active = False
        self.huerta.save(update_fields=['is_active'])
        self.assertEqual(self._post_inversion().status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self._post_venta().status_code, status.HTTP_400_BAD_REQUEST)

    def test_archived_temporada(self):
        self.temporada.is_active = False
        self.temporada.save(update_fields=['is_active'])
        self.assertEqual(self._post_inversion().status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self._post_venta().status_code, status.HTTP_400_BAD_REQUEST)

    def test_finalized_temporada(self):
        self.temporada.finalizada = True
        self.temporada.save(update_fields=['finalizada'])
        self.assertEqual(self._post_inversion().status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self._post_venta().status_code, status.HTTP_400_BAD_REQUEST)

    def test_archived_cosecha(self):
        self.cosecha.is_active = False
        self.cosecha.save(update_fields=['is_active'])
        self.assertEqual(self._post_inversion().status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self._post_venta().status_code, status.HTTP_400_BAD_REQUEST)

    def test_finalized_cosecha(self):
        self.cosecha.finalizada = True
        self.cosecha.save(update_fields=['finalizada'])
        self.assertEqual(self._post_inversion().status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self._post_venta().status_code, status.HTTP_400_BAD_REQUEST)
