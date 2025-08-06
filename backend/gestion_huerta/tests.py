from django.test import TestCase
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone

from .models import (
    Propietario,
    Huerta,
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
                nombre="Inv",
                fecha=timezone.now().date(),
                descripcion="",
                gastos_insumos=0,
                gastos_mano_obra=0,
                categoria=categoria,
                cosecha=cosecha,
                huerta=self.huerta,
            )
            Venta.objects.create(
                cosecha=cosecha,
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
