from django.test import TestCase
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework.test import APIClient

from .models import (
    Propietario,
    Huerta,
    Temporada,
    Cosecha,
    CategoriaInversion,
    InversionesHuerta,
    Venta,
)


class TemporadaDesarchivarTests(TestCase):
    def setUp(self):
        propietario = Propietario.objects.create(
            nombre="Pablo",
            apellidos="Perez",
            telefono="1234567890",
            direccion="Dir",
        )
        self.huerta = Huerta.objects.create(
            nombre="Mi Huerta",
            ubicacion="Ubic",
            variedades="Var",
            historial="",
            hectareas=1,
            propietario=propietario,
        )
        self.temporada = Temporada.objects.create(año=2024, huerta=self.huerta)
        categoria = CategoriaInversion.objects.create(nombre="Cat")

        for i in range(3):
            cosecha = Cosecha.objects.create(
                nombre=f"C{i}",
                temporada=self.temporada,
                huerta=self.huerta,
            )
            InversionesHuerta.objects.create(
                nombre="Inv",
                fecha=timezone.now().date(),
                descripcion="",
                gastos_insumos=0,
                gastos_mano_obra=0,
                categoria=categoria,
                cosecha=cosecha,
                huerta=self.huerta,
            )
            Venta.objects.create(
                cosecha=cosecha,
                fecha_venta=timezone.now().date(),
                num_cajas=1,
                precio_por_caja=1,
                tipo_mango="Ataulfo",
                descripcion="",
                gasto=0,
            )

        self.temporada.archivar()

    def _old_desarchivar(self, temporada):
        if not temporada.is_active:
            temporada.is_active = True
            temporada.archivado_en = None
            temporada.save(update_fields=["is_active", "archivado_en"])
            for cosecha in temporada.cosechas.all():
                cosecha.is_active = True
                cosecha.archivado_en = None
                cosecha.save(update_fields=["is_active", "archivado_en"])
                cosecha.inversiones.update(is_active=True, archivado_en=None)
                cosecha.ventas.update(is_active=True, archivado_en=None)

    def test_query_count_and_data_restored(self):
        with CaptureQueriesContext(connection) as ctx_old:
            self._old_desarchivar(self.temporada)
        old_count = len(ctx_old)

        self.temporada.archivar()

        with CaptureQueriesContext(connection) as ctx_new:
            self.temporada.desarchivar()
        new_count = len(ctx_new)

        self.assertLess(new_count, old_count)

        self.temporada.refresh_from_db()
        self.assertTrue(self.temporada.is_active)
        self.assertIsNone(self.temporada.archivado_en)

        for cosecha in self.temporada.cosechas.all():
            self.assertTrue(cosecha.is_active)
            self.assertIsNone(cosecha.archivado_en)
            for inv in cosecha.inversiones.all():
                self.assertTrue(inv.is_active)
                self.assertIsNone(inv.archivado_en)
        for venta in cosecha.ventas.all():
            self.assertTrue(venta.is_active)
            self.assertIsNone(venta.archivado_en)


class BloqueoCreacionInversionVentaTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            telefono="9999999999",
            password="pass",
            nombre="Admin",
            apellido="User",
            role="admin",
            is_staff=True,
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        propietario = Propietario.objects.create(
            nombre="Juan",
            apellidos="Lopez",
            telefono="1111111111",
            direccion="Dir",
        )
        self.huerta = Huerta.objects.create(
            nombre="H1",
            ubicacion="Ubic",
            variedades="Var",
            historial="",
            hectareas=1,
            propietario=propietario,
        )
        self.temporada = Temporada.objects.create(año=2024, huerta=self.huerta)
        self.cosecha = Cosecha.objects.create(
            nombre="C1",
            temporada=self.temporada,
            huerta=self.huerta,
        )
        self.categoria = CategoriaInversion.objects.create(nombre="Cat")

        today = timezone.localdate().isoformat()
        self.inversion_data = {
            "categoria_id": self.categoria.id,
            "fecha": today,
            "gastos_insumos": "100.00",
            "gastos_mano_obra": "50.00",
            "cosecha_id": self.cosecha.id,
            "temporada_id": self.temporada.id,
            "huerta_id": self.huerta.id,
        }
        self.venta_data = {
            "fecha_venta": today,
            "tipo_mango": "Ataulfo",
            "num_cajas": 1,
            "precio_por_caja": 1,
            "gasto": "0",
            "cosecha_id": self.cosecha.id,
            "temporada_id": self.temporada.id,
            "huerta_id": self.huerta.id,
        }

        self.inv_url = reverse("huerta:inversion-list")
        self.venta_url = reverse("huerta:venta-list")

    def _post_inversion(self):
        return self.client.post(self.inv_url, self.inversion_data, format="json")

    def _post_venta(self):
        return self.client.post(self.venta_url, self.venta_data, format="json")

    def test_bloqueo_por_huerta_archivada(self):
        self.huerta.is_active = False
        self.huerta.archivado_en = timezone.now()
        self.huerta.save(update_fields=["is_active", "archivado_en"])

        resp_inv = self._post_inversion()
        self.assertEqual(resp_inv.status_code, 400)
        self.assertIn(
            "No se pueden registrar inversiones en una huerta archivada.",
            resp_inv.json()["data"]["errors"]["huerta_id"][0],
        )

        resp_venta = self._post_venta()
        self.assertEqual(resp_venta.status_code, 400)
        self.assertIn(
            "No se pueden registrar/editar ventas en una huerta archivada.",
            resp_venta.json()["data"]["errors"]["huerta_id"][0],
        )

    def test_bloqueo_por_temporada_finalizada(self):
        self.temporada.finalizar()

        resp_inv = self._post_inversion()
        self.assertEqual(resp_inv.status_code, 400)
        self.assertIn(
            "No se pueden registrar inversiones en una temporada finalizada o archivada.",
            resp_inv.json()["data"]["errors"]["temporada_id"][0],
        )

        resp_venta = self._post_venta()
        self.assertEqual(resp_venta.status_code, 400)
        self.assertIn(
            "No se pueden registrar/editar ventas en una temporada finalizada o archivada.",
            resp_venta.json()["data"]["errors"]["temporada_id"][0],
        )

    def test_bloqueo_por_cosecha_finalizada(self):
        self.cosecha.finalizar()

        resp_inv = self._post_inversion()
        self.assertEqual(resp_inv.status_code, 400)
        self.assertIn(
            "No se pueden registrar inversiones en una cosecha finalizada.",
            resp_inv.json()["data"]["errors"]["cosecha_id"][0],
        )

        resp_venta = self._post_venta()
        self.assertEqual(resp_venta.status_code, 400)
        self.assertIn(
            "No se pueden registrar/editar ventas en una cosecha finalizada.",
            resp_venta.json()["data"]["errors"]["cosecha_id"][0],
        )
