from django.test import TestCase
from django.utils import timezone
from django.core.exceptions import ValidationError

from gestion_huerta.models import (
    Propietario,
    Huerta,
    Temporada,
    Cosecha,
    CategoriaInversion,
    InversionesHuerta,
    Venta,
)


class ModelCreationValidationTests(TestCase):
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
        self.cosecha = Cosecha.objects.create(nombre="C1", temporada=self.temporada, huerta=self.huerta)
        self.categoria = CategoriaInversion.objects.create(nombre="Cat")

    def test_inversion_rechaza_cosecha_finalizada(self):
        self.cosecha.finalizar()
        with self.assertRaises(ValidationError):
            InversionesHuerta.objects.create(
                categoria=self.categoria,
                fecha=timezone.now().date(),
                descripcion="",
                gastos_insumos=0,
                gastos_mano_obra=0,
                cosecha=self.cosecha,
                temporada=self.temporada,
                huerta=self.huerta,
            )

    def test_inversion_rechaza_temporada_archivada(self):
        self.temporada.is_active = False
        self.temporada.save()
        with self.assertRaises(ValidationError):
            InversionesHuerta.objects.create(
                categoria=self.categoria,
                fecha=timezone.now().date(),
                descripcion="",
                gastos_insumos=0,
                gastos_mano_obra=0,
                cosecha=self.cosecha,
                temporada=self.temporada,
                huerta=self.huerta,
            )

    def test_venta_rechaza_huerta_archivada(self):
        self.huerta.is_active = False
        self.huerta.save()
        with self.assertRaises(ValidationError):
            Venta.objects.create(
                fecha_venta=timezone.now().date(),
                num_cajas=1,
                precio_por_caja=1,
                tipo_mango="Ataulfo",
                descripcion="",
                gasto=0,
                cosecha=self.cosecha,
                temporada=self.temporada,
                huerta=self.huerta,
            )

    def test_creacion_valida(self):
        inv = InversionesHuerta.objects.create(
            categoria=self.categoria,
            fecha=timezone.now().date(),
            descripcion="",
            gastos_insumos=0,
            gastos_mano_obra=0,
            cosecha=self.cosecha,
            temporada=self.temporada,
            huerta=self.huerta,
        )
        self.assertIsNotNone(inv.pk)

        venta = Venta.objects.create(
            fecha_venta=timezone.now().date(),
            num_cajas=1,
            precio_por_caja=1,
            tipo_mango="Ataulfo",
            descripcion="",
            gasto=0,
            cosecha=self.cosecha,
            temporada=self.temporada,
            huerta=self.huerta,
        )
        self.assertIsNotNone(venta.pk)
