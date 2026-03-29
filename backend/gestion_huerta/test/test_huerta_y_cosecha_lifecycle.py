from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from gestion_huerta.models import (
    CategoriaInversion,
    CategoriaPreCosecha,
    Cosecha,
    Huerta,
    InversionesHuerta,
    PreCosecha,
    Propietario,
    Temporada,
    Venta,
)


class HuertaYCosechaLifecycleTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            telefono="7000000005",
            password="pass12345",
            nombre="Admin",
            apellido="LifecycleHuerta",
            role="admin",
            is_staff=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        propietario = Propietario.objects.create(
            nombre="Propietario",
            apellidos="Huerta",
            telefono="5555555555",
            direccion="Direccion",
        )
        self.huerta = Huerta.objects.create(
            nombre="Huerta Profunda",
            ubicacion="Zona E",
            variedades="Ataulfo",
            historial="",
            hectareas=3,
            propietario=propietario,
        )
        self.today = timezone.localdate()

        self.temporada_operativa = Temporada.objects.create(
            **{"a\u00f1o": self.today.year},
            fecha_inicio=self.today - timedelta(days=20),
            estado_operativo=Temporada.EstadoOperativo.OPERATIVA,
            huerta=self.huerta,
        )
        self.cosecha = Cosecha.objects.create(
            nombre="Cosecha Principal",
            temporada=self.temporada_operativa,
            huerta=self.huerta,
            fecha_inicio=timezone.now() - timedelta(days=1),
        )

        self.categoria_inversion = CategoriaInversion.objects.create(nombre="Riego")
        self.inversion = InversionesHuerta.objects.create(
            categoria=self.categoria_inversion,
            fecha=self.today,
            descripcion="Inversion activa",
            gastos_insumos=Decimal("40.00"),
            gastos_mano_obra=Decimal("10.00"),
            cosecha=self.cosecha,
            temporada=self.temporada_operativa,
            huerta=self.huerta,
        )
        self.venta = Venta.objects.create(
            fecha_venta=self.today,
            num_cajas=5,
            precio_por_caja=30,
            tipo_mango="Ataulfo",
            descripcion="Venta activa",
            gasto=10,
            cosecha=self.cosecha,
            temporada=self.temporada_operativa,
            huerta=self.huerta,
        )

        self.temporada_planificada = Temporada.objects.create(
            **{"a\u00f1o": self.today.year + 1},
            fecha_inicio=self.today + timedelta(days=20),
            estado_operativo=Temporada.EstadoOperativo.PLANIFICADA,
            huerta=self.huerta,
        )
        self.categoria_precosecha = CategoriaPreCosecha.objects.create(nombre="Preparacion")
        self.precosecha = PreCosecha.objects.create(
            temporada=self.temporada_planificada,
            huerta=self.huerta,
            categoria=self.categoria_precosecha,
            fecha=self.temporada_planificada.fecha_inicio - timedelta(days=4),
            gastos_insumos=Decimal("60.00"),
            gastos_mano_obra=Decimal("15.00"),
            descripcion="Preparacion futura",
        )

    def test_cosecha_lifecycle_con_cascada_y_guardas_de_borrado(self):
        list_response = self.client.get(
            f"/huerta/cosechas/?temporada={self.temporada_operativa.id}"
        )
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.json()["data"]["meta"]["total_registradas"], 1)

        finalize_response = self.client.post(
            f"/huerta/cosechas/{self.cosecha.id}/toggle-finalizada/",
            format="json",
        )
        self.assertEqual(finalize_response.status_code, 200)
        self.assertEqual(finalize_response.json()["notification"]["key"], "cosecha_finalizada")

        reactivate_response = self.client.post(
            f"/huerta/cosechas/{self.cosecha.id}/reactivar/",
            format="json",
        )
        self.assertEqual(reactivate_response.status_code, 200)
        self.assertEqual(reactivate_response.json()["notification"]["key"], "cosecha_reactivada")

        delete_active = self.client.delete(f"/huerta/cosechas/{self.cosecha.id}/")
        self.assertEqual(delete_active.status_code, 400)
        self.assertEqual(delete_active.json()["notification"]["key"], "cosecha_debe_estar_archivada")

        archive_response = self.client.post(
            f"/huerta/cosechas/{self.cosecha.id}/archivar/",
            format="json",
        )
        self.assertEqual(archive_response.status_code, 200)

        self.inversion.refresh_from_db()
        self.venta.refresh_from_db()
        self.assertFalse(self.inversion.is_active)
        self.assertFalse(self.venta.is_active)

        delete_with_dependencies = self.client.delete(f"/huerta/cosechas/{self.cosecha.id}/")
        self.assertEqual(delete_with_dependencies.status_code, 400)
        self.assertEqual(
            delete_with_dependencies.json()["notification"]["key"],
            "cosecha_con_dependencias",
        )

        restore_response = self.client.post(
            f"/huerta/cosechas/{self.cosecha.id}/restaurar/",
            format="json",
        )
        self.assertEqual(restore_response.status_code, 200)
        self.inversion.refresh_from_db()
        self.venta.refresh_from_db()
        self.assertTrue(self.inversion.is_active)
        self.assertTrue(self.venta.is_active)

    def test_huerta_archivar_y_restaurar_hace_cascada_profunda(self):
        archive_response = self.client.post(
            f"/huerta/huertas/{self.huerta.id}/archivar/",
            format="json",
        )
        self.assertEqual(archive_response.status_code, 200)
        affected = archive_response.json()["data"]["affected"]
        self.assertEqual(affected["huertas"], 1)
        self.assertEqual(affected["temporadas"], 2)
        self.assertEqual(affected["cosechas"], 1)
        self.assertEqual(affected["inversiones"], 1)
        self.assertEqual(affected["ventas"], 1)
        self.assertEqual(affected["precosechas"], 1)

        self.huerta.refresh_from_db()
        self.temporada_operativa.refresh_from_db()
        self.temporada_planificada.refresh_from_db()
        self.cosecha.refresh_from_db()
        self.inversion.refresh_from_db()
        self.venta.refresh_from_db()
        self.precosecha.refresh_from_db()
        self.assertFalse(self.huerta.is_active)
        self.assertFalse(self.temporada_operativa.is_active)
        self.assertFalse(self.temporada_planificada.is_active)
        self.assertFalse(self.cosecha.is_active)
        self.assertFalse(self.inversion.is_active)
        self.assertFalse(self.venta.is_active)
        self.assertFalse(self.precosecha.is_active)

        restore_response = self.client.post(
            f"/huerta/huertas/{self.huerta.id}/restaurar/",
            format="json",
        )
        self.assertEqual(restore_response.status_code, 200)
        affected_restore = restore_response.json()["data"]["affected"]
        self.assertEqual(affected_restore["huertas"], 1)
        self.assertEqual(affected_restore["temporadas"], 2)
        self.assertEqual(affected_restore["cosechas"], 1)
        self.assertEqual(affected_restore["inversiones"], 1)
        self.assertEqual(affected_restore["ventas"], 1)
        self.assertEqual(affected_restore["precosechas"], 1)

        self.huerta.refresh_from_db()
        self.temporada_operativa.refresh_from_db()
        self.temporada_planificada.refresh_from_db()
        self.cosecha.refresh_from_db()
        self.inversion.refresh_from_db()
        self.venta.refresh_from_db()
        self.precosecha.refresh_from_db()
        self.assertTrue(self.huerta.is_active)
        self.assertTrue(self.temporada_operativa.is_active)
        self.assertTrue(self.temporada_planificada.is_active)
        self.assertTrue(self.cosecha.is_active)
        self.assertTrue(self.inversion.is_active)
        self.assertTrue(self.venta.is_active)
        self.assertTrue(self.precosecha.is_active)
