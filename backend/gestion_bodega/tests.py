from uuid import uuid4

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from gestion_bodega.models import Bodega, TemporadaBodega, Recepcion


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

    def _create_temporada(self, bodega: Bodega, año: int = 2024, **extra) -> TemporadaBodega:
        payload = {
            "bodega": bodega,
            "año": año,
            "fecha_inicio": extra.get("fecha_inicio", timezone.now().date()),
            "finalizada": extra.get("finalizada", False),
        }
        payload.update({k: v for k, v in extra.items() if k not in payload})
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
        self.assertEqual(body["notification"]["key"], "bodega_archivada_no_permite_temporadas")
        self.assertEqual(TemporadaBodega.objects.count(), 0)

    def test_create_temporada_duplicate_year_rejected(self):
        bodega = self._create_bodega()
        payload = {"bodega_id": bodega.id, "año": 2025}
        first = self.client.post(self.temporadas_url, payload, format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        duplicate = self.client.post(self.temporadas_url, payload, format="json")
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(duplicate.json()["notification"]["key"], "violacion_unicidad_anio")

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
        self.assertEqual(response.json()["notification"]["key"], "bodega_archivada_no_permite_temporadas")

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
        self.assertEqual(response.json()["notification"]["key"], "registro_archivado_no_editable")

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

    def test_delete_temporada_with_dependencies_rejected(self):
        bodega = self._create_bodega()
        temporada = self._create_temporada(bodega, 2019)
        Recepcion.objects.create(
            bodega=bodega,
            temporada=temporada,
            fecha=timezone.now().date(),
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
