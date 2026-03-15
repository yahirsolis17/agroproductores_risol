from datetime import timedelta
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from gestion_bodega.models import (
    Bodega,
    CamionConsumoEmpaque,
    CamionSalida,
    CierreSemanal,
    ClasificacionEmpaque,
    CompraMadera,
    Recepcion,
    TemporadaBodega,
)
from gestion_huerta.models import (
    CategoriaInversion,
    Cosecha,
    Huerta,
    InversionesHuerta,
    Propietario,
    Temporada,
    Venta,
)
from gestion_usuarios.models import RegistroActividad, Users


class DashboardApiTests(APITestCase):
    def setUp(self):
        today = timezone.localdate()
        self.admin = Users.objects.create_superuser(
            telefono='5550000100',
            password='Admin2026',
            nombre='Admin',
            apellido='Dashboard',
        )
        self.client.force_authenticate(user=self.admin)

        propietario = Propietario.objects.create(
            nombre='Ramon',
            apellidos='Solis',
            telefono='6670000000',
            direccion='El Rosario',
        )
        huerta = Huerta.objects.create(
            nombre='Huerta Norte',
            ubicacion='Rosario',
            variedades='Ataulfo',
            hectareas=12.5,
            propietario=propietario,
        )
        temporada = Temporada.objects.create(
            año=today.year,
            huerta=huerta,
            fecha_inicio=today - timedelta(days=40),
        )
        cosecha = Cosecha.objects.create(
            nombre='Cosecha Principal',
            temporada=temporada,
            huerta=huerta,
        )
        categoria = CategoriaInversion.objects.create(nombre='Fertilizante')
        InversionesHuerta.objects.create(
            categoria=categoria,
            fecha=today - timedelta(days=4),
            gastos_insumos=Decimal('1800.00'),
            gastos_mano_obra=Decimal('650.00'),
            cosecha=cosecha,
            temporada=temporada,
            huerta=huerta,
        )
        Venta.objects.create(
            fecha_venta=today - timedelta(days=2),
            num_cajas=48,
            precio_por_caja=180,
            tipo_mango='Ataulfo',
            gasto=250,
            cosecha=cosecha,
            temporada=temporada,
            huerta=huerta,
        )

        self.bodega = Bodega.objects.create(nombre='Bodega Norte', ubicacion='Zona Industrial')
        self.temporada_bodega = TemporadaBodega.objects.create(
            año=today.year,
            bodega=self.bodega,
            fecha_inicio=today - timedelta(days=20),
        )
        semana = CierreSemanal.objects.create(
            bodega=self.bodega,
            temporada=self.temporada_bodega,
            fecha_desde=today - timedelta(days=5),
            locked_by=self.admin,
        )
        recepcion = Recepcion.objects.create(
            bodega=self.bodega,
            temporada=self.temporada_bodega,
            semana=semana,
            fecha=today - timedelta(days=1),
            huertero_nombre='Juan Campo',
            tipo_mango='Ataulfo',
            cajas_campo=120,
        )
        clasificacion = ClasificacionEmpaque.objects.create(
            recepcion=recepcion,
            bodega=self.bodega,
            temporada=self.temporada_bodega,
            semana=semana,
            fecha=today - timedelta(days=1),
            material='MADERA',
            calidad='PRIMERA',
            tipo_mango='Ataulfo',
            cantidad_cajas=80,
        )
        compra = CompraMadera.objects.create(
            bodega=self.bodega,
            temporada=self.temporada_bodega,
            proveedor_nombre='Maderas del Norte',
            cantidad_cajas=Decimal('200.00'),
            precio_unitario=Decimal('10.00'),
        )
        compra.stock_actual = Decimal('120.00')
        compra.save(update_fields=['stock_actual'])
        camion = CamionSalida.objects.create(
            bodega=self.bodega,
            temporada=self.temporada_bodega,
            semana=semana,
            fecha_salida=today - timedelta(days=1),
        )
        CamionConsumoEmpaque.objects.create(
            camion=camion,
            clasificacion_empaque=clasificacion,
            cantidad=30,
        )
        RegistroActividad.objects.create(
            usuario=self.admin,
            accion='Actualizo tablero',
            detalles='ruta=/bodega/tablero; metodo=GET',
            ip='127.0.0.1',
        )

        self.overview_url = reverse('gestion_usuarios:dashboard-overview')
        self.search_url = reverse('gestion_usuarios:dashboard-search')

    def test_overview_returns_real_sections(self):
        response = self.client.get(self.overview_url)

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        payload = response.data['data']
        self.assertEqual(payload['hero']['headline'], 'Centro de mando inteligente')
        self.assertGreaterEqual(len(payload['alerts']), 1)
        self.assertGreaterEqual(len(payload['comparisons']), 3)
        self.assertEqual(payload['modules'][0]['id'], 'huerta')
        self.assertEqual(payload['modules'][1]['id'], 'bodega')
        self.assertEqual(
            payload['next_action']['to'],
            f'/bodega/tablero?bodega={self.bodega.id}&temporada={self.temporada_bodega.id}',
        )

    def test_search_returns_cross_module_results(self):
        response = self.client.get(self.search_url, {'q': 'Norte'})

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        results = response.data['data']['results']
        groups = {item['group'] for item in results}
        self.assertIn('Huertas', groups)
        self.assertIn('Bodegas', groups)
