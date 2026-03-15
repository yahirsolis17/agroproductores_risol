from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from gestion_bodega.models import (
    Bodega,
    CamionConsumoEmpaque,
    CamionSalida,
    CierreSemanal,
    ClasificacionEmpaque,
    Material,
    Recepcion,
    TemporadaBodega,
)
from gestion_bodega.utils.inventario_empaque import get_disponible_for_clasificacion
from gestion_bodega.utils.reporting import aggregates_for_semana


class LogisticaSanityTest(TestCase):
    def setUp(self):
        self.bodega = Bodega.objects.create(nombre="Bodega Test")
        self.temporada = TemporadaBodega.objects.create(
            bodega=self.bodega,
            año=2025,
            fecha_inicio=timezone.localdate(),
        )
        self.semana = CierreSemanal.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_desde=timezone.localdate() - timedelta(days=1),
            fecha_hasta=None,
        )

    def test_smoke_flow(self):
        recepcion = Recepcion.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            semana=self.semana,
            fecha=timezone.localdate(),
            huertero_nombre="Huerta Test",
            tipo_mango="ATAULFO",
            cajas_campo=100,
        )
        primera = ClasificacionEmpaque.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            semana=self.semana,
            recepcion=recepcion,
            fecha=timezone.localdate(),
            material=Material.PLASTICO,
            calidad="PRIMERA",
            tipo_mango="ATAULFO",
            cantidad_cajas=80,
        )
        ClasificacionEmpaque.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            semana=self.semana,
            recepcion=recepcion,
            fecha=timezone.localdate(),
            material=Material.PLASTICO,
            calidad="TERCERA",
            tipo_mango="ATAULFO",
            cantidad_cajas=20,
        )

        self.assertEqual(get_disponible_for_clasificacion(primera.id), 80)

        camion = CamionSalida.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            semana=self.semana,
            fecha_salida=timezone.localdate(),
            chofer="Juan Perez",
            destino="Mercado Test",
        )
        CamionConsumoEmpaque.objects.create(
            camion=camion,
            clasificacion_empaque=primera,
            cantidad=80,
        )

        self.assertEqual(get_disponible_for_clasificacion(primera.id), 0)

        camion.confirmar()
        camion.refresh_from_db()
        self.assertEqual(camion.estado, "CONFIRMADO")
        self.assertIsNotNone(camion.numero)

        report = aggregates_for_semana(
            self.bodega.id,
            self.temporada.id,
            iso_semana=self.semana.iso_semana,
        )
        rows = report["tablas"]["empaques"]["rows"]
        self.assertTrue(any(row[0] == "PLASTICO" and row[1] == "PRIMERA" for row in rows))
