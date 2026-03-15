from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from gestion_bodega.models import (
    Bodega,
    CierreSemanal,
    ClasificacionEmpaque,
    Material,
    Recepcion,
    TemporadaBodega,
)
from gestion_bodega.utils.recepcion_aggregates import annotate_recepcion_status


class RecepcionAggregatesTest(TestCase):
    def setUp(self):
        self.bodega = Bodega.objects.create(nombre="Bodega Test")
        self.temporada = TemporadaBodega.objects.create(
            bodega=self.bodega,
            año=2025,
            fecha_inicio=timezone.localdate(),
        )
        today = timezone.localdate()
        self.semana = CierreSemanal.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_desde=today,
            fecha_hasta=None,
            iso_semana="2025-W01",
        )
        self.recepcion = Recepcion.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            semana=self.semana,
            fecha=today,
            tipo_mango="KENT",
            cajas_campo=100,
            huertero_nombre="Test Huertero",
        )

    def test_aggregation_sin_empaque(self):
        obj = annotate_recepcion_status(Recepcion.objects.filter(id=self.recepcion.id)).first()
        self.assertEqual(obj.cajas_empaquetadas, 0)
        self.assertEqual(obj.cajas_disponibles, 100)
        self.assertEqual(obj.empaque_status, "SIN_EMPAQUE")

    def test_aggregation_parcial(self):
        ClasificacionEmpaque.objects.create(
            recepcion=self.recepcion,
            bodega=self.bodega,
            temporada=self.temporada,
            semana=self.semana,
            fecha=timezone.localdate(),
            material=Material.PLASTICO,
            calidad="PRIMERA",
            tipo_mango="KENT",
            cantidad_cajas=40,
        )
        obj = annotate_recepcion_status(Recepcion.objects.all()).first()
        self.assertEqual(obj.cajas_empaquetadas, 40)
        self.assertEqual(obj.cajas_disponibles, 60)
        self.assertEqual(obj.empaque_status, "PARCIAL")

    def test_aggregation_completo(self):
        ClasificacionEmpaque.objects.create(
            recepcion=self.recepcion,
            bodega=self.bodega,
            temporada=self.temporada,
            semana=self.semana,
            fecha=timezone.localdate(),
            material=Material.PLASTICO,
            calidad="PRIMERA",
            tipo_mango="KENT",
            cantidad_cajas=100,
        )
        obj = annotate_recepcion_status(Recepcion.objects.all()).first()
        self.assertEqual(obj.cajas_empaquetadas, 100)
        self.assertEqual(obj.cajas_disponibles, 0)
        self.assertEqual(obj.empaque_status, "EMPACADO")

    def test_aggregation_merma_total(self):
        ClasificacionEmpaque.objects.create(
            recepcion=self.recepcion,
            bodega=self.bodega,
            temporada=self.temporada,
            semana=self.semana,
            fecha=timezone.localdate(),
            material=Material.PLASTICO,
            calidad="MERMA",
            tipo_mango="KENT",
            cantidad_cajas=30,
        )
        obj = annotate_recepcion_status(Recepcion.objects.all()).first()
        self.assertEqual(obj.cajas_empaquetadas, 0)
        self.assertEqual(obj.cajas_merma, 30)
        self.assertEqual(obj.empaque_status, "MERMA_TOTAL")

    def test_overpacking_is_rejected_before_aggregation(self):
        with self.assertRaises(ValidationError):
            ClasificacionEmpaque.objects.create(
                recepcion=self.recepcion,
                bodega=self.bodega,
                temporada=self.temporada,
                semana=self.semana,
                fecha=timezone.localdate(),
                material=Material.PLASTICO,
                calidad="PRIMERA",
                tipo_mango="KENT",
                cantidad_cajas=110,
            )
