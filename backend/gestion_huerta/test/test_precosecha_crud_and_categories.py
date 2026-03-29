from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from gestion_huerta.models import (
    CategoriaPreCosecha,
    Huerta,
    PreCosecha,
    Propietario,
    Temporada,
)


class PreCosechaCrudAndCascadeTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            telefono="7000000002",
            password="pass12345",
            nombre="Admin",
            apellido="PreCosechaCrud",
            role="admin",
            is_staff=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        propietario = Propietario.objects.create(
            nombre="Propietario",
            apellidos="PreCosecha",
            telefono="5522222222",
            direccion="Direccion",
        )
        self.huerta = Huerta.objects.create(
            nombre="Huerta PreCosecha",
            ubicacion="Zona B",
            variedades="Ataulfo",
            historial="",
            hectareas=4,
            propietario=propietario,
        )
        self.categoria = CategoriaPreCosecha.objects.create(nombre="Preparacion General")
        self.today = timezone.localdate()
        self.temporada = Temporada.objects.create(
            **{"a\u00f1o": self.today.year + 1},
            fecha_inicio=self.today + timedelta(days=25),
            estado_operativo=Temporada.EstadoOperativo.PLANIFICADA,
            huerta=self.huerta,
        )

    def _crear_precosecha(self, dias_antes: int, descripcion: str, archived: bool = False):
        precosecha = PreCosecha.objects.create(
            temporada=self.temporada,
            huerta=self.huerta,
            categoria=self.categoria,
            fecha=self.temporada.fecha_inicio - timedelta(days=dias_antes),
            gastos_insumos=Decimal("100.00"),
            gastos_mano_obra=Decimal("20.00"),
            descripcion=descripcion,
        )
        if archived:
            precosecha.archivar()
        return precosecha

    def test_precosecha_list_filtra_por_estado_y_fechas(self):
        primera = self._crear_precosecha(12, "Lote temprano")
        segunda = self._crear_precosecha(5, "Lote medio")
        archivada = self._crear_precosecha(2, "Lote archivado", archived=True)

        response = self.client.get(
            f"/huerta/precosechas/?temporada={self.temporada.id}"
            f"&fecha_desde={(self.temporada.fecha_inicio - timedelta(days=6)).isoformat()}"
            f"&fecha_hasta={(self.temporada.fecha_inicio - timedelta(days=4)).isoformat()}"
        )
        self.assertEqual(response.status_code, 200)
        active_ids = {item["id"] for item in response.json()["data"]["results"]}
        self.assertIn(segunda.id, active_ids)
        self.assertNotIn(primera.id, active_ids)
        self.assertNotIn(archivada.id, active_ids)

        archived_response = self.client.get(
            f"/huerta/precosechas/?temporada={self.temporada.id}&estado=archivadas"
        )
        self.assertEqual(archived_response.status_code, 200)
        archived_ids = {item["id"] for item in archived_response.json()["data"]["results"]}
        self.assertEqual(archived_ids, {archivada.id})

    def test_precosecha_requiere_archivado_para_eliminar_y_puede_restaurarse(self):
        precosecha = self._crear_precosecha(6, "Registro ciclo")

        delete_active = self.client.delete(f"/huerta/precosechas/{precosecha.id}/")
        self.assertEqual(delete_active.status_code, 400)
        self.assertEqual(
            delete_active.json()["notification"]["key"],
            "precosecha_debe_estar_archivada",
        )

        archive_response = self.client.post(
            f"/huerta/precosechas/{precosecha.id}/archivar/",
            format="json",
        )
        self.assertEqual(archive_response.status_code, 200)

        update_archived = self.client.patch(
            f"/huerta/precosechas/{precosecha.id}/",
            {"descripcion": "Cambio no permitido"},
            format="json",
        )
        self.assertEqual(update_archived.status_code, 400)
        self.assertEqual(
            update_archived.json()["notification"]["key"],
            "precosecha_archivada_no_editar",
        )

        restore_response = self.client.post(
            f"/huerta/precosechas/{precosecha.id}/restaurar/",
            format="json",
        )
        self.assertEqual(restore_response.status_code, 200)

        second_archive = self.client.post(
            f"/huerta/precosechas/{precosecha.id}/archivar/",
            format="json",
        )
        self.assertEqual(second_archive.status_code, 200)

        delete_archived = self.client.delete(f"/huerta/precosechas/{precosecha.id}/")
        self.assertEqual(delete_archived.status_code, 200)
        self.assertFalse(PreCosecha.objects.filter(pk=precosecha.id).exists())

    def test_temporada_archivar_y_restaurar_respeta_cascada_de_precosechas(self):
        cascada = self._crear_precosecha(8, "Cascada")
        manual = self._crear_precosecha(4, "Manual")
        manual.archivar()

        archive_response = self.client.post(
            f"/huerta/temporadas/{self.temporada.id}/archivar/",
            format="json",
        )
        self.assertEqual(archive_response.status_code, 200)
        affected = archive_response.json()["data"]["affected"]
        self.assertEqual(affected["precosechas"], 1)

        cascada.refresh_from_db()
        manual.refresh_from_db()
        self.assertFalse(cascada.is_active)
        self.assertTrue(cascada.archivado_por_cascada)
        self.assertFalse(manual.is_active)
        self.assertFalse(manual.archivado_por_cascada)

        restore_response = self.client.post(
            f"/huerta/temporadas/{self.temporada.id}/restaurar/",
            format="json",
        )
        self.assertEqual(restore_response.status_code, 200)
        self.assertEqual(restore_response.json()["data"]["affected"]["precosechas"], 1)

        cascada.refresh_from_db()
        manual.refresh_from_db()
        self.assertTrue(cascada.is_active)
        self.assertFalse(cascada.archivado_por_cascada)
        self.assertFalse(manual.is_active)

    def test_temporada_no_se_puede_eliminar_si_tiene_precosechas(self):
        temporada_actual_planificada = Temporada.objects.create(
            **{"a\u00f1o": self.today.year},
            fecha_inicio=self.today - timedelta(days=7),
            estado_operativo=Temporada.EstadoOperativo.PLANIFICADA,
            huerta=self.huerta,
        )
        PreCosecha.objects.create(
            temporada=temporada_actual_planificada,
            huerta=self.huerta,
            categoria=self.categoria,
            fecha=temporada_actual_planificada.fecha_inicio - timedelta(days=3),
            gastos_insumos=Decimal("90.00"),
            gastos_mano_obra=Decimal("15.00"),
            descripcion="Dependencia",
        )

        activate_response = self.client.post(
            f"/huerta/temporadas/{temporada_actual_planificada.id}/activar-operativa/",
            format="json",
        )
        self.assertEqual(activate_response.status_code, 200)

        finalize_response = self.client.post(
            f"/huerta/temporadas/{temporada_actual_planificada.id}/finalizar/",
            format="json",
        )
        self.assertEqual(finalize_response.status_code, 200)

        archive_response = self.client.post(
            f"/huerta/temporadas/{temporada_actual_planificada.id}/archivar/",
            format="json",
        )
        self.assertEqual(archive_response.status_code, 200)

        delete_response = self.client.delete(f"/huerta/temporadas/{temporada_actual_planificada.id}/")
        self.assertEqual(delete_response.status_code, 400)
        self.assertEqual(
            delete_response.json()["notification"]["key"],
            "temporada_con_dependencias",
        )


class CategoriaPreCosechaApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            telefono="7000000003",
            password="pass12345",
            nombre="Admin",
            apellido="CategoriaPreCosecha",
            role="admin",
            is_staff=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        propietario = Propietario.objects.create(
            nombre="Propietario",
            apellidos="Categorias",
            telefono="5533333333",
            direccion="Direccion",
        )
        self.huerta = Huerta.objects.create(
            nombre="Huerta Categorias",
            ubicacion="Zona C",
            variedades="Ataulfo",
            historial="",
            hectareas=2,
            propietario=propietario,
        )
        self.temporada = Temporada.objects.create(
            **{"a\u00f1o": timezone.localdate().year + 1},
            fecha_inicio=timezone.localdate() + timedelta(days=20),
            estado_operativo=Temporada.EstadoOperativo.PLANIFICADA,
            huerta=self.huerta,
        )

    def test_categoria_precosecha_crud_y_guardas_de_borrado(self):
        create_response = self.client.post(
            "/huerta/categorias-precosecha/",
            {"nombre": "Fertilizacion"},
            format="json",
        )
        self.assertEqual(create_response.status_code, 201)
        categoria_id = create_response.json()["data"]["categoria"]["id"]

        update_response = self.client.patch(
            f"/huerta/categorias-precosecha/{categoria_id}/",
            {"nombre": "Fertilizacion Inicial"},
            format="json",
        )
        self.assertEqual(update_response.status_code, 200)

        delete_active = self.client.delete(f"/huerta/categorias-precosecha/{categoria_id}/")
        self.assertEqual(delete_active.status_code, 400)
        self.assertEqual(
            delete_active.json()["notification"]["key"],
            "categoria_precosecha_debe_estar_archivada",
        )

        categoria = CategoriaPreCosecha.objects.get(pk=categoria_id)
        PreCosecha.objects.create(
            temporada=self.temporada,
            huerta=self.huerta,
            categoria=categoria,
            fecha=self.temporada.fecha_inicio - timedelta(days=3),
            gastos_insumos=Decimal("50.00"),
            gastos_mano_obra=Decimal("10.00"),
            descripcion="Registro asociado",
        )

        archive_response = self.client.post(
            f"/huerta/categorias-precosecha/{categoria_id}/archivar/",
            format="json",
        )
        self.assertEqual(archive_response.status_code, 200)

        update_archived = self.client.patch(
            f"/huerta/categorias-precosecha/{categoria_id}/",
            {"nombre": "Bloqueada"},
            format="json",
        )
        self.assertEqual(update_archived.status_code, 400)
        self.assertEqual(
            update_archived.json()["notification"]["key"],
            "categoria_precosecha_archivada_no_editar",
        )

        delete_used = self.client.delete(f"/huerta/categorias-precosecha/{categoria_id}/")
        self.assertEqual(delete_used.status_code, 400)
        self.assertEqual(
            delete_used.json()["notification"]["key"],
            "categoria_precosecha_con_registros",
        )

        unused_response = self.client.post(
            "/huerta/categorias-precosecha/",
            {"nombre": "Rastreo"},
            format="json",
        )
        self.assertEqual(unused_response.status_code, 201)
        unused_id = unused_response.json()["data"]["categoria"]["id"]

        archive_unused = self.client.post(
            f"/huerta/categorias-precosecha/{unused_id}/archivar/",
            format="json",
        )
        self.assertEqual(archive_unused.status_code, 200)

        list_all = self.client.get("/huerta/categorias-precosecha/all/")
        self.assertEqual(list_all.status_code, 200)
        all_ids = {item["id"] for item in list_all.json()["data"]["results"]}
        self.assertIn(categoria_id, all_ids)
        self.assertIn(unused_id, all_ids)

        delete_unused = self.client.delete(f"/huerta/categorias-precosecha/{unused_id}/")
        self.assertEqual(delete_unused.status_code, 200)
