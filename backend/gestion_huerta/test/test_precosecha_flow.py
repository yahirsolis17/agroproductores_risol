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
from gestion_usuarios.services.dashboard_service import (
    build_dashboard_overview,
    build_dashboard_search,
)


class PreCosechaFlowTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            telefono="6666666666",
            password="pass12345",
            nombre="Admin",
            apellido="PreCosecha",
            role="admin",
            is_staff=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        propietario = Propietario.objects.create(
            nombre="Dueno",
            apellidos="Huerta",
            telefono="1234567890",
            direccion="Dir",
        )
        self.huerta = Huerta.objects.create(
            nombre="Huerta Planificada",
            ubicacion="Ubicacion",
            variedades="Ataulfo",
            historial="",
            hectareas=3,
            propietario=propietario,
        )
        self.categoria = CategoriaPreCosecha.objects.create(nombre="Preparacion")

        self.fecha_inicio = timezone.localdate() + timedelta(days=30)
        self.temporada = Temporada.objects.create(
            **{"a\u00f1o": self.fecha_inicio.year},
            fecha_inicio=self.fecha_inicio,
            estado_operativo=Temporada.EstadoOperativo.PLANIFICADA,
            huerta=self.huerta,
        )

    def test_crea_precosecha_valida_en_temporada_planificada(self):
        response = self.client.post(
            "/huerta/precosechas/",
            {
                "temporada_id": self.temporada.id,
                "categoria_id": self.categoria.id,
                "fecha": (self.fecha_inicio - timedelta(days=1)).isoformat(),
                "gastos_insumos": "100.50",
                "gastos_mano_obra": "0.00",
                "descripcion": "Fertilizacion inicial",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["notification"]["key"], "precosecha_create_success")
        self.assertEqual(PreCosecha.objects.count(), 1)

        precosecha = PreCosecha.objects.get()
        self.assertEqual(precosecha.temporada_id, self.temporada.id)
        self.assertEqual(precosecha.huerta_id, self.huerta.id)
        self.assertEqual(precosecha.gastos_insumos, Decimal("100.50"))
        self.assertEqual(precosecha.gastos_mano_obra, Decimal("0.00"))

    def test_rechaza_precosecha_en_fecha_igual_o_posterior_al_inicio_operativo(self):
        response = self.client.post(
            "/huerta/precosechas/",
            {
                "temporada_id": self.temporada.id,
                "categoria_id": self.categoria.id,
                "fecha": self.fecha_inicio.isoformat(),
                "gastos_insumos": "50.00",
                "gastos_mano_obra": "25.00",
                "descripcion": "Intento invalido",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        body = response.json()
        self.assertEqual(body["notification"]["key"], "precosecha_fecha_fuera_de_temporada")
        self.assertEqual(PreCosecha.objects.count(), 0)

    def test_precosecha_queda_congelada_al_activar_temporada_operativa(self):
        self.temporada.fecha_inicio = timezone.localdate()
        self.temporada.save(update_fields=["fecha_inicio"])

        precosecha = PreCosecha.objects.create(
            temporada=self.temporada,
            huerta=self.huerta,
            categoria=self.categoria,
            fecha=timezone.localdate() - timedelta(days=2),
            gastos_insumos=Decimal("80.00"),
            gastos_mano_obra=Decimal("20.00"),
            descripcion="Preparacion previa",
        )

        activate_response = self.client.post(
            f"/huerta/temporadas/{self.temporada.id}/activar-operativa/",
            format="json",
        )
        self.assertEqual(activate_response.status_code, 200)
        self.temporada.refresh_from_db()
        self.assertEqual(self.temporada.estado_operativo, Temporada.EstadoOperativo.OPERATIVA)

        update_response = self.client.put(
            f"/huerta/precosechas/{precosecha.id}/",
            {"descripcion": "Cambio bloqueado"},
            format="json",
        )
        self.assertEqual(update_response.status_code, 400)
        self.assertEqual(update_response.json()["notification"]["key"], "precosecha_temporada_congelada")

        archive_response = self.client.post(
            f"/huerta/precosechas/{precosecha.id}/archivar/",
            format="json",
        )
        self.assertEqual(archive_response.status_code, 400)
        self.assertEqual(archive_response.json()["notification"]["key"], "precosecha_temporada_congelada")

    def test_no_permite_reasignar_precosecha_a_otra_temporada(self):
        otra_temporada = Temporada.objects.create(
            **{"a\u00f1o": getattr(self.temporada, "a\u00f1o") + 1},
            fecha_inicio=self.fecha_inicio + timedelta(days=365),
            estado_operativo=Temporada.EstadoOperativo.PLANIFICADA,
            huerta=self.huerta,
        )
        precosecha = PreCosecha.objects.create(
            temporada=self.temporada,
            huerta=self.huerta,
            categoria=self.categoria,
            fecha=self.fecha_inicio - timedelta(days=2),
            gastos_insumos=Decimal("60.00"),
            gastos_mano_obra=Decimal("10.00"),
            descripcion="Preparacion original",
        )

        response = self.client.put(
            f"/huerta/precosechas/{precosecha.id}/",
            {
                "temporada_id": otra_temporada.id,
                "categoria_id": self.categoria.id,
                "fecha": (self.fecha_inicio - timedelta(days=2)).isoformat(),
                "gastos_insumos": "60.00",
                "gastos_mano_obra": "10.00",
                "descripcion": "Intento de mover ownership",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["notification"]["key"],
            "precosecha_temporada_no_reasignable",
        )
        precosecha.refresh_from_db()
        self.assertEqual(precosecha.temporada_id, self.temporada.id)


class PreCosechaReportingAndDashboardTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            telefono="5555555555",
            password="pass12345",
            nombre="Admin",
            apellido="Dashboard",
            role="admin",
            is_staff=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        propietario = Propietario.objects.create(
            nombre="Prop",
            apellidos="Tester",
            telefono="3333333333",
            direccion="Dir",
        )
        self.huerta_planificada = Huerta.objects.create(
            nombre="Huerta Futura",
            ubicacion="Ubic Fut",
            variedades="Ataulfo",
            historial="",
            hectareas=2,
            propietario=propietario,
        )
        self.huerta_operativa = Huerta.objects.create(
            nombre="Huerta Operativa",
            ubicacion="Ubic Op",
            variedades="Tommy",
            historial="",
            hectareas=4,
            propietario=propietario,
        )
        self.categoria = CategoriaPreCosecha.objects.create(nombre="Abonado")

        hoy = timezone.localdate()
        self.temporada_planificada = Temporada.objects.create(
            **{"a\u00f1o": hoy.year},
            fecha_inicio=hoy + timedelta(days=20),
            estado_operativo=Temporada.EstadoOperativo.PLANIFICADA,
            huerta=self.huerta_planificada,
        )
        self.temporada_operativa = Temporada.objects.create(
            **{"a\u00f1o": hoy.year},
            fecha_inicio=hoy - timedelta(days=10),
            estado_operativo=Temporada.EstadoOperativo.OPERATIVA,
            huerta=self.huerta_operativa,
        )
        PreCosecha.objects.create(
            temporada=self.temporada_planificada,
            huerta=self.huerta_planificada,
            categoria=self.categoria,
            fecha=self.temporada_planificada.fecha_inicio - timedelta(days=5),
            gastos_insumos=Decimal("90.00"),
            gastos_mano_obra=Decimal("30.00"),
            descripcion="Preparacion 2027",
        )

    def test_dashboard_excluye_temporadas_planificadas_del_contexto_operativo(self):
        overview = build_dashboard_overview(self.user)
        featured = overview["contexts"]["featured_temporada"]
        self.assertIsNotNone(featured)
        self.assertEqual(featured["id"], self.temporada_operativa.id)

        hero_temporadas = next(
            stat for stat in overview["hero"]["stats"] if stat["id"] == "hero-temporadas"
        )
        self.assertEqual(hero_temporadas["value"], 1)

        search_results = build_dashboard_search(self.user, "Huerta")["results"]
        temporada_ids = {
            item["to"].split("/")[-1]
            for item in search_results
            if item.get("group") == "Temporadas" and item.get("to")
        }
        self.assertIn(str(self.temporada_operativa.id), temporada_ids)
        self.assertNotIn(str(self.temporada_planificada.id), temporada_ids)

    def test_reporte_temporada_incluye_bloque_separado_de_precosecha(self):
        response = self.client.post(
            "/huerta/reportes/temporada/",
            {
                "temporada_id": self.temporada_planificada.id,
                "formato": "json",
                "force_refresh": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        reporte = response.json()["data"]["reporte"]
        self.assertEqual(reporte["precosechas"]["total"], 120.0)
        self.assertEqual(len(reporte["precosechas"]["detalle"]), 1)
        self.assertEqual(reporte["resumen_ejecutivo"]["precosecha_total"], 120.0)
        self.assertEqual(reporte["resumen_ejecutivo"]["ganancia_neta_con_precosecha"], -120.0)
        self.assertEqual(reporte["comparativo_cosechas"], [])
