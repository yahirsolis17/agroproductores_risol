from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from gestion_huerta.models import Huerta, Propietario, Temporada


class TemporadaLifecycleApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            telefono="7000000001",
            password="pass12345",
            nombre="Admin",
            apellido="Lifecycle",
            role="admin",
            is_staff=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        propietario = Propietario.objects.create(
            nombre="Propietario",
            apellidos="Temporada",
            telefono="5511111111",
            direccion="Direccion",
        )
        self.huerta = Huerta.objects.create(
            nombre="Huerta Lifecycle",
            ubicacion="Zona A",
            variedades="Ataulfo",
            historial="",
            hectareas=5,
            propietario=propietario,
        )
        self.today = timezone.localdate()
        self.current_year = self.today.year
        self.future_year = self.today.year + 1

    def _temporada_payload(self, year: int, fecha_inicio, **extra):
        payload = {
            "huerta": self.huerta.id,
            "fecha_inicio": fecha_inicio.isoformat(),
        }
        payload.update(extra)
        payload["a\u00f1o"] = year
        return payload

    def test_crear_temporada_futura_asigna_planificada_por_defecto(self):
        response = self.client.post(
            "/huerta/temporadas/",
            self._temporada_payload(self.future_year, self.today + timedelta(days=20)),
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        temporada = response.json()["data"]["temporada"]
        self.assertEqual(temporada["estado_operativo"], Temporada.EstadoOperativo.PLANIFICADA)

    def test_crear_temporada_futura_operativa_es_rechazado(self):
        response = self.client.post(
            "/huerta/temporadas/",
            self._temporada_payload(
                self.future_year,
                self.today + timedelta(days=20),
                estado_operativo=Temporada.EstadoOperativo.OPERATIVA,
            ),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["notification"]["key"], "temporada_operativa_futura")

    def test_crear_temporada_operativa_con_fecha_futura_es_rechazado(self):
        response = self.client.post(
            "/huerta/temporadas/",
            self._temporada_payload(
                self.current_year,
                self.today + timedelta(days=10),
                estado_operativo=Temporada.EstadoOperativo.OPERATIVA,
            ),
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["notification"]["key"],
            "temporada_operativa_fecha_futura",
        )

    def test_estado_operativo_no_se_puede_cambiar_directamente_por_update(self):
        temporada = Temporada.objects.create(
            **{"a\u00f1o": self.current_year},
            fecha_inicio=self.today,
            estado_operativo=Temporada.EstadoOperativo.OPERATIVA,
            huerta=self.huerta,
        )

        response = self.client.patch(
            f"/huerta/temporadas/{temporada.id}/",
            {"estado_operativo": Temporada.EstadoOperativo.PLANIFICADA},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["notification"]["key"],
            "temporada_estado_operativo_no_editable",
        )

    def test_list_filtra_temporadas_planificadas_y_operativas(self):
        planificada = Temporada.objects.create(
            **{"a\u00f1o": self.future_year},
            fecha_inicio=self.today + timedelta(days=30),
            estado_operativo=Temporada.EstadoOperativo.PLANIFICADA,
            huerta=self.huerta,
        )
        operativa = Temporada.objects.create(
            **{"a\u00f1o": self.current_year},
            fecha_inicio=self.today - timedelta(days=10),
            estado_operativo=Temporada.EstadoOperativo.OPERATIVA,
            huerta=self.huerta,
        )

        response_planificadas = self.client.get(
            "/huerta/temporadas/?estado_operativo=planificadas&estado=todos"
        )
        self.assertEqual(response_planificadas.status_code, 200)
        planificadas_ids = {
            item["id"] for item in response_planificadas.json()["data"]["results"]
        }
        self.assertIn(planificada.id, planificadas_ids)
        self.assertNotIn(operativa.id, planificadas_ids)

        response_operativas = self.client.get(
            "/huerta/temporadas/?estado_operativo=operativas&estado=todos"
        )
        self.assertEqual(response_operativas.status_code, 200)
        operativas_ids = {
            item["id"] for item in response_operativas.json()["data"]["results"]
        }
        self.assertIn(operativa.id, operativas_ids)
        self.assertNotIn(planificada.id, operativas_ids)

    def test_activar_operativa_respeta_guardrails(self):
        archivada = Temporada.objects.create(
            **{"a\u00f1o": self.future_year},
            fecha_inicio=self.today + timedelta(days=10),
            estado_operativo=Temporada.EstadoOperativo.PLANIFICADA,
            huerta=self.huerta,
        )
        archivada.archivar()

        finalizada = Temporada.objects.create(
            **{"a\u00f1o": self.current_year},
            fecha_inicio=self.today - timedelta(days=20),
            estado_operativo=Temporada.EstadoOperativo.OPERATIVA,
            huerta=self.huerta,
            finalizada=True,
            fecha_fin=self.today - timedelta(days=1),
        )

        operativa = Temporada.objects.create(
            **{"a\u00f1o": self.current_year - 1},
            fecha_inicio=self.today - timedelta(days=60),
            estado_operativo=Temporada.EstadoOperativo.OPERATIVA,
            huerta=self.huerta,
        )

        archived_response = self.client.post(
            f"/huerta/temporadas/{archivada.id}/activar-operativa/",
            format="json",
        )
        self.assertEqual(archived_response.status_code, 400)
        self.assertEqual(
            archived_response.json()["notification"]["key"],
            "temporada_archivada_no_activar_operativa",
        )

        finalized_response = self.client.post(
            f"/huerta/temporadas/{finalizada.id}/activar-operativa/",
            format="json",
        )
        self.assertEqual(finalized_response.status_code, 400)
        self.assertEqual(
            finalized_response.json()["notification"]["key"],
            "temporada_finalizada_no_activar_operativa",
        )

        operativa_response = self.client.post(
            f"/huerta/temporadas/{operativa.id}/activar-operativa/",
            format="json",
        )
        self.assertEqual(operativa_response.status_code, 400)
        self.assertEqual(
            operativa_response.json()["notification"]["key"],
            "temporada_ya_operativa",
        )

    def test_no_se_puede_activar_operativa_antes_de_fecha_inicio(self):
        temporada = Temporada.objects.create(
            **{"a\u00f1o": self.current_year},
            fecha_inicio=self.today + timedelta(days=5),
            estado_operativo=Temporada.EstadoOperativo.PLANIFICADA,
            huerta=self.huerta,
        )

        response = self.client.post(
            f"/huerta/temporadas/{temporada.id}/activar-operativa/",
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["notification"]["key"],
            "temporada_operativa_antes_de_inicio",
        )

    def test_no_se_puede_activar_operativa_en_temporada_futura(self):
        temporada = Temporada.objects.create(
            **{"a\u00f1o": self.future_year},
            fecha_inicio=self.today + timedelta(days=30),
            estado_operativo=Temporada.EstadoOperativo.PLANIFICADA,
            huerta=self.huerta,
        )

        response = self.client.post(
            f"/huerta/temporadas/{temporada.id}/activar-operativa/",
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(
            body["notification"]["key"],
            "temporada_futura_no_activar_operativa",
        )
        self.assertIn("estado_operativo", body["data"]["errors"])

    def test_temporada_planificada_no_puede_finalizarse(self):
        temporada = Temporada.objects.create(
            **{"a\u00f1o": self.future_year},
            fecha_inicio=self.today + timedelta(days=12),
            estado_operativo=Temporada.EstadoOperativo.PLANIFICADA,
            huerta=self.huerta,
        )

        response = self.client.post(
            f"/huerta/temporadas/{temporada.id}/finalizar/",
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["notification"]["key"],
            "temporada_planificada_no_finalizar",
        )

    def test_no_se_puede_crear_cosecha_en_temporada_planificada(self):
        temporada = Temporada.objects.create(
            **{"a\u00f1o": self.future_year},
            fecha_inicio=self.today + timedelta(days=15),
            estado_operativo=Temporada.EstadoOperativo.PLANIFICADA,
            huerta=self.huerta,
        )

        response = self.client.post(
            "/huerta/cosechas/",
            {
                "temporada": temporada.id,
                "nombre": "Intento bloqueado",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["notification"]["key"], "cosecha_temporada_planificada")
