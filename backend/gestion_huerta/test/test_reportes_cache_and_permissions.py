from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from gestion_huerta.models import Propietario, Huerta, Temporada, Cosecha


class ReportesTemporadaPermissionChainTests(TestCase):
    def setUp(self):
        cache.clear()
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            telefono="6660000000",
            password="secret123",
            nombre="Usuario",
            apellido="Reportes",
            role="usuario",
        )
        self.admin = user_model.objects.create_user(
            telefono="6660000001",
            password="secret123",
            nombre="Admin",
            apellido="Reportes",
            role="admin",
        )

        propietario = Propietario.objects.create(
            nombre="Juan",
            apellidos="Perez",
            telefono="5556667777",
            direccion="Calle 1",
        )
        self.huerta = Huerta.objects.create(
            nombre="Huerta Reportes",
            ubicacion="Zona 1",
            variedades="Ataulfo",
            hectareas=4,
            propietario=propietario,
        )
        self.temporada = Temporada.objects.create(año=2026, huerta=self.huerta)
        self.cosecha = Cosecha.objects.create(
            nombre="Cosecha 1",
            temporada=self.temporada,
            huerta=self.huerta,
        )
        self.temporada_report_url = "/huerta/reportes/temporada/"

    def test_reporte_temporada_funciona_con_solo_view_temporada(self):
        permission = Permission.objects.get(codename="view_temporada")
        self.user.user_permissions.add(permission)

        client = APIClient()
        client.force_authenticate(user=self.user)

        response = client.post(
            self.temporada_report_url,
            {
                "temporada_id": self.temporada.id,
                "formato": "json",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["notification"]["key"], "reporte_generado_exitosamente")
        self.assertEqual(
            body["data"]["reporte"]["informacion_general"]["huerta_nombre"],
            self.huerta.nombre,
        )

    def test_cache_de_reportes_se_invalida_cuando_cambia_la_huerta(self):
        client = APIClient()
        client.force_authenticate(user=self.admin)

        first = client.post(
            self.temporada_report_url,
            {
                "temporada_id": self.temporada.id,
                "formato": "json",
            },
            format="json",
        )
        self.assertEqual(first.status_code, 200)
        self.assertEqual(
            first.json()["data"]["reporte"]["informacion_general"]["huerta_nombre"],
            "Huerta Reportes",
        )

        with self.captureOnCommitCallbacks(execute=True):
            self.huerta.nombre = "Huerta Renombrada"
            self.huerta.save(update_fields=["nombre"])

        second = client.post(
            self.temporada_report_url,
            {
                "temporada_id": self.temporada.id,
                "formato": "json",
            },
            format="json",
        )

        self.assertEqual(second.status_code, 200)
        self.assertEqual(
            second.json()["data"]["reporte"]["informacion_general"]["huerta_nombre"],
            "Huerta Renombrada",
        )
