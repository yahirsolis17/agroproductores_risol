from django.test import TestCase
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.urls import reverse
from unittest.mock import patch

from rest_framework.test import APIClient

from .models import (
    Propietario,
    Huerta,
    HuertaRentada,
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
                fecha=timezone.now().date(),
                descripcion="",
                gastos_insumos=0,
                gastos_mano_obra=0,
                categoria=categoria,
                cosecha=cosecha,
                temporada=self.temporada,
                huerta=self.huerta,
            )
            Venta.objects.create(
                cosecha=cosecha,
                temporada=self.temporada,
                huerta=self.huerta,
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
        self.assertEqual(resp_inv.json()["notification"]["key"], "inversion_temporada_finalizada")
        self.assertIn("temporada finalizada", resp_inv.json()["data"]["info"].lower())

        resp_venta = self._post_venta()
        self.assertEqual(resp_venta.status_code, 400)
        self.assertEqual(resp_venta.json()["notification"]["key"], "venta_contexto_temporada_finalizada")
        self.assertIn("temporada", resp_venta.json()["data"]["info"].lower())

    def test_bloqueo_por_cosecha_finalizada(self):
        self.cosecha.finalizar()

        resp_inv = self._post_inversion()
        self.assertEqual(resp_inv.status_code, 400)
        self.assertEqual(resp_inv.json()["notification"]["key"], "inversion_cosecha_finalizada")
        self.assertIn("cosecha finalizada", resp_inv.json()["data"]["info"].lower())

        resp_venta = self._post_venta()
        self.assertEqual(resp_venta.status_code, 400)
        self.assertEqual(resp_venta.json()["notification"]["key"], "venta_contexto_cosecha_finalizada")
        self.assertIn("cosecha", resp_venta.json()["data"]["info"].lower())


class PerfilHuertaReportTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            telefono="8888888888",
            password="pass12345",
            nombre="Operador",
            apellido="Huerta",
            role="usuario",
        )
        self.admin = User.objects.create_user(
            telefono="7777777777",
            password="pass12345",
            nombre="Admin",
            apellido="Reportes",
            role="admin",
            is_staff=True,
        )

        propietario = Propietario.objects.create(
            nombre="Renta",
            apellidos="Tester",
            telefono="2222222222",
            direccion="Dir",
        )
        self.huerta = Huerta.objects.create(
            nombre="Huerta Base",
            ubicacion="Ubic",
            variedades="Var",
            historial="",
            hectareas=2,
            propietario=propietario,
        )
        self.huerta_rentada = HuertaRentada.objects.create(
            nombre="Huerta Rentada",
            ubicacion="Ubic Rentada",
            variedades="Var",
            historial="",
            hectareas=2,
            propietario=propietario,
            monto_renta="1000.00",
        )
        self.temporada_rentada = Temporada.objects.create(
            año=2024,
            huerta_rentada=self.huerta_rentada,
            finalizada=True,
            fecha_fin=timezone.localdate(),
        )
        self.perfil_url = "/huerta/reportes/perfil-huerta/"

    def test_perfil_huerta_rentada_funciona_con_permiso_correcto(self):
        permission = Permission.objects.get(codename="view_huertarentada")
        self.user.user_permissions.add(permission)

        client = APIClient()
        client.force_authenticate(user=self.user)

        response = client.post(
            self.perfil_url,
            {
                "huerta_rentada_id": self.huerta_rentada.id,
                "años": 5,
                "formato": "json",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["notification"]["key"], "reporte_generado_exitosamente")
        self.assertEqual(
            body["data"]["reporte"]["informacion_general"]["huerta_nombre"],
            self.huerta_rentada.nombre,
        )

    def test_reporte_cacheado_sigue_validando_permisos_tras_revocacion(self):
        permission = Permission.objects.get(codename="view_huertarentada")
        self.user.user_permissions.add(permission)

        client = APIClient()
        client.force_authenticate(user=self.user)

        first = client.post(
            self.perfil_url,
            {
                "huerta_rentada_id": self.huerta_rentada.id,
                "años": 5,
                "formato": "json",
            },
            format="json",
        )
        self.assertEqual(first.status_code, 200)

        self.user.user_permissions.clear()
        refreshed_user = get_user_model().objects.get(pk=self.user.pk)
        client.force_authenticate(user=refreshed_user)
        second = client.post(
            self.perfil_url,
            {
                "huerta_rentada_id": self.huerta_rentada.id,
                "años": 5,
                "formato": "json",
            },
            format="json",
        )

        self.assertEqual(second.status_code, 403)
        self.assertEqual(second.json()["notification"]["key"], "permission_denied")

    def test_server_error_no_expone_detalle_interno(self):
        client = APIClient()
        client.force_authenticate(user=self.admin)

        with patch(
            "gestion_huerta.views.reportes.perfil_huerta_views.generar_perfil_huerta",
            side_effect=Exception("boom secreto"),
        ):
            response = client.post(
                self.perfil_url,
                {
                    "huerta_id": self.huerta.id,
                    "años": 5,
                    "formato": "json",
                },
                format="json",
            )

        self.assertEqual(response.status_code, 500)
        body = response.json()
        self.assertEqual(body["notification"]["key"], "server_error")
        self.assertNotIn("boom secreto", str(body))
