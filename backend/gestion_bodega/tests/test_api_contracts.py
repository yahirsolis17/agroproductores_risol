from datetime import timedelta
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from gestion_bodega.models import Bodega, CierreSemanal, Recepcion, TemporadaBodega


class TemporadaBodegaAPITests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser(
            telefono="9990000000",
            password="secret123",
            nombre="Test",
            apellido="Admin",
        )
        self.client.force_authenticate(self.user)
        self.temporadas_url = "/bodega/temporadas/"
        self.bodegas_url = "/bodega/bodegas/"

    def _unique_name(self, prefix: str) -> str:
        return f"{prefix}-{uuid4().hex[:8]}"

    def _create_bodega(self) -> Bodega:
        return Bodega.objects.create(
            nombre=self._unique_name("Bodega"),
            ubicacion="Zona Norte",
        )

    def _create_temporada(self, bodega: Bodega, ano: int = 2024, **extra) -> TemporadaBodega:
        payload = {
            "bodega": bodega,
            "año": ano,
            "fecha_inicio": extra.get("fecha_inicio", timezone.localdate()),
            "finalizada": extra.get("finalizada", False),
        }
        payload.update({key: value for key, value in extra.items() if key not in payload})
        return TemporadaBodega.objects.create(**payload)

    def test_create_temporada_with_active_bodega(self):
        bodega = self._create_bodega()
        response = self.client.post(
            self.temporadas_url,
            {"bodega_id": bodega.id, "año": 2025},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()
        self.assertEqual(body["notification"]["key"], "temporadabodega_creada")
        self.assertEqual(TemporadaBodega.objects.filter(bodega=bodega).count(), 1)

    def test_create_temporada_blocks_when_bodega_archived(self):
        bodega = self._create_bodega()
        bodega.archivar()
        response = self.client.post(
            self.temporadas_url,
            {"bodega_id": bodega.id, "año": 2025},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        body = response.json()
        self.assertIn(
            body["notification"]["key"],
            ["bodega_archivada_no_permite_temporadas", "validation_error"],
        )
        self.assertEqual(TemporadaBodega.objects.count(), 0)

    def test_create_temporada_duplicate_year_rejected(self):
        bodega = self._create_bodega()
        payload = {"bodega_id": bodega.id, "año": 2025}
        first = self.client.post(self.temporadas_url, payload, format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        duplicate = self.client.post(self.temporadas_url, payload, format="json")
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(duplicate.json()["notification"]["key"], "violacion_unicidad_año")

    def test_bodega_archivar_cascades_to_temporadas(self):
        bodega = self._create_bodega()
        temporada = self._create_temporada(bodega, 2023)

        response = self.client.post(f"{self.bodegas_url}{bodega.id}/archivar/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["notification"]["key"], "bodega_archivada")

        temporada.refresh_from_db()
        self.assertFalse(temporada.is_active)
        self.assertIsNotNone(temporada.archivado_en)

    def test_bodega_restaurar_cascades_to_temporadas(self):
        bodega = self._create_bodega()
        temporada = self._create_temporada(bodega, 2022)

        self.client.post(f"{self.bodegas_url}{bodega.id}/archivar/")
        response = self.client.post(f"{self.bodegas_url}{bodega.id}/restaurar/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["notification"]["key"], "bodega_restaurada")

        temporada.refresh_from_db()
        self.assertTrue(temporada.is_active)
        self.assertIsNone(temporada.archivado_en)

    def test_restaurar_temporada_blocked_when_bodega_archived(self):
        bodega = self._create_bodega()
        temporada = self._create_temporada(bodega, 2021)
        self.client.post(f"{self.bodegas_url}{bodega.id}/archivar/")

        response = self.client.post(f"{self.temporadas_url}{temporada.id}/restaurar/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.json()["notification"]["key"],
            "bodega_archivada_no_permite_temporadas",
        )

    def test_partial_update_prevents_archived_temporada(self):
        bodega = self._create_bodega()
        temporada = self._create_temporada(bodega, 2020)
        temporada.archivar()

        response = self.client.patch(
            f"{self.temporadas_url}{temporada.id}/",
            {"fecha_fin": "2020-12-31"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.json()["notification"]["key"],
            "registro_archivado_no_editable",
        )

    def test_partial_update_allows_active_temporada(self):
        bodega = self._create_bodega()
        temporada = self._create_temporada(bodega, 2026)

        response = self.client.patch(
            f"{self.temporadas_url}{temporada.id}/",
            {"fecha_fin": "2026-07-15"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["notification"]["key"], "temporadabodega_actualizada")

        temporada.refresh_from_db()
        self.assertEqual(str(temporada.fecha_fin), "2026-07-15")

    def _open_week(self, bodega: Bodega, temporada: TemporadaBodega, start=None, end=None):
        return CierreSemanal.objects.create(
            bodega=bodega,
            temporada=temporada,
            fecha_desde=start or timezone.localdate(),
            fecha_hasta=end,
        )

    def test_delete_temporada_with_dependencies_rejected(self):
        bodega = self._create_bodega()
        temporada = self._create_temporada(bodega, 2019)
        semana = self._open_week(bodega, temporada)
        Recepcion.objects.create(
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            fecha=timezone.localdate(),
            tipo_mango="Ataulfo",
            cajas_campo=10,
        )
        temporada.finalizada = True
        temporada.save(update_fields=["finalizada"])
        temporada.archivar()

        response = self.client.delete(f"{self.temporadas_url}{temporada.id}/")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.json()["notification"]["key"], "dependencias_presentes")
        self.assertTrue(TemporadaBodega.objects.filter(id=temporada.id).exists())

    def test_delete_temporada_archived_without_dependencies(self):
        bodega = self._create_bodega()
        temporada = self._create_temporada(bodega, 2018, finalizada=True)
        temporada.archivar()

        response = self.client.delete(f"{self.temporadas_url}{temporada.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["notification"]["key"], "temporadabodega_eliminada")
        self.assertFalse(TemporadaBodega.objects.filter(id=temporada.id).exists())


class RecepcionAPITests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser(
            telefono="9990000001",
            password="secret123",
            nombre="Test",
            apellido="Recepciones",
        )
        self.client.force_authenticate(self.user)
        self.recepciones_url = "/bodega/recepciones/"
        self.bodega = Bodega.objects.create(nombre="Bodega Test", ubicacion="Norte")
        self.temporada = TemporadaBodega.objects.create(
            bodega=self.bodega,
            año=2025,
            fecha_inicio=timezone.localdate(),
        )

    def _open_week(self, start=None, end=None):
        return CierreSemanal.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_desde=start or timezone.localdate(),
            fecha_hasta=end,
        )

    def test_create_recepcion_success_sets_semana(self):
        semana = self._open_week()
        payload = {
            "bodega": self.bodega.id,
            "temporada": self.temporada.id,
            "fecha": str(semana.fecha_desde),
            "huertero_nombre": "Juan",
            "tipo_mango": "Ataulfo",
            "cantidad_cajas": 50,
        }
        response = self.client.post(self.recepciones_url, payload, format="json")
        body = response.json()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(body["notification"]["key"], "recepcion_create_success")
        self.assertEqual(body["data"]["recepcion"]["semana"], semana.id)
        self.assertEqual(body["data"]["recepcion"]["cajas_campo"], 50)

    def test_create_recepcion_blocked_when_week_closed(self):
        start = timezone.localdate() - timedelta(days=2)
        self._open_week(start=start, end=start + timedelta(days=1))
        payload = {
            "bodega": self.bodega.id,
            "temporada": self.temporada.id,
            "fecha": str(start),
            "huertero_nombre": "Pedro",
            "tipo_mango": "Kent",
            "cantidad_cajas": 10,
        }
        response = self.client.post(self.recepciones_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.json()["notification"]["key"], "recepcion_semana_cerrada")
        self.assertFalse(Recepcion.objects.filter(bodega=self.bodega, fecha=start).exists())

    def test_create_recepcion_future_date_rejected(self):
        self._open_week()
        tomorrow = timezone.localdate() + timedelta(days=1)
        payload = {
            "bodega": self.bodega.id,
            "temporada": self.temporada.id,
            "fecha": str(tomorrow),
            "huertero_nombre": "Luis",
            "tipo_mango": "Tommy",
            "cantidad_cajas": 5,
        }
        response = self.client.post(self.recepciones_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("fecha", response.json().get("data", {}).get("errors", {}))

    def test_list_recepciones_returns_meta_and_aliases(self):
        semana = self._open_week()
        for nombre, cajas in [("A", 10), ("B", 20)]:
            Recepcion.objects.create(
                bodega=self.bodega,
                temporada=self.temporada,
                semana=semana,
                fecha=semana.fecha_desde,
                huertero_nombre=nombre,
                tipo_mango="Ataulfo",
                cajas_campo=cajas,
            )

        response = self.client.get(
            self.recepciones_url,
            {
                "bodega": self.bodega.id,
                "temporada": self.temporada.id,
                "semana": semana.id,
            },
        )
        body = response.json()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(body["data"]["meta"]["count"], 2)
        self.assertEqual(len(body["data"]["recepciones"]), 2)
        self.assertEqual(len(body["data"]["results"]), 2)

    def test_create_recepcion_without_week_returns_semana_error(self):
        payload = {
            "bodega": self.bodega.id,
            "temporada": self.temporada.id,
            "fecha": str(timezone.localdate()),
            "huertero_nombre": "SinSemana",
            "tipo_mango": "Haden",
            "cantidad_cajas": 8,
        }
        response = self.client.post(self.recepciones_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["notification"]["key"], "recepcion_semana_invalida")


class CierresAPITests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser(
            telefono="9990000003",
            password="secret123",
            nombre="Test",
            apellido="Cierres",
        )
        self.client.force_authenticate(self.user)
        self.url = "/bodega/cierres/semanal/"
        self.bodega = Bodega.objects.create(nombre="Bodega Cierres", ubicacion="Centro")
        self.temporada = TemporadaBodega.objects.create(
            bodega=self.bodega,
            año=2026,
            fecha_inicio=timezone.localdate() - timedelta(days=30),
        )

    def test_open_week_endpoint_auto_closes_expired_open_week(self):
        old_start = timezone.localdate() - timedelta(days=9)
        old_week = CierreSemanal.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_desde=old_start,
            fecha_hasta=None,
        )

        response = self.client.post(
            self.url,
            {
                "bodega": self.bodega.id,
                "temporada": self.temporada.id,
                "fecha_desde": str(timezone.localdate()),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["notification"]["key"], "cierre_semanal_creado")

        old_week.refresh_from_db()
        self.assertEqual(old_week.fecha_hasta, old_start + timedelta(days=6))
        self.assertEqual(
            CierreSemanal.objects.filter(
                bodega=self.bodega,
                temporada=self.temporada,
                fecha_hasta__isnull=True,
                is_active=True,
            ).count(),
            1,
        )


class RecepcionPermissionAPITests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            telefono="9990000002",
            password="secret123",
            nombre="Test",
            apellido="Usuario",
            role="usuario",
        )
        self.bodega = Bodega.objects.create(nombre="Bodega Permisos")
        self.temporada = TemporadaBodega.objects.create(
            bodega=self.bodega,
            año=2026,
            fecha_inicio=timezone.localdate(),
        )
        self.url = "/bodega/recepciones/"

    def test_user_without_required_permission_gets_403(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url, {"bodega": self.bodega.id, "temporada": self.temporada.id})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_user_with_required_permission_can_list(self):
        permission = Permission.objects.get(codename="view_recepcion")
        self.user.user_permissions.add(permission)
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url, {"bodega": self.bodega.id, "temporada": self.temporada.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
