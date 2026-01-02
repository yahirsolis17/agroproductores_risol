# gestion_bodega/tests/test_week_integrity.py
"""
Tests de integridad para gestión de semanas operativas.
Verifica reglas de negocio críticas: unicidad, duración máxima, recepciones, clasificaciones.
"""
from datetime import date, timedelta
from django.test import TestCase
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from gestion_bodega.models import (
    Bodega,
    TemporadaBodega,
    CierreSemanal,
    Recepcion,
    ClasificacionEmpaque,
    Material,
)
from gestion_bodega.services.week_service import WeekService

User = get_user_model()


class WeekIntegrityTestCase(TestCase):
    """Tests de integridad para semanas operativas"""

    def setUp(self):
        """Configuración común para todos los tests"""
        self.user = User.objects.create_user(
            username="test_user",
            email="test@example.com",
            password="password"
        )
        
        self.bodega = Bodega.objects.create(nombre="Bodega Test", ubicacion="Ubicación Test")
        
        self.temporada = TemporadaBodega.objects.create(
            bodega=self.bodega,
            año=2026,
            fecha_inicio=date(2026, 1, 1),
        )

    def test_unicidad_semana_abierta(self):
        """
        Test 1: No pueden existir dos semanas abiertas simultáneas para la misma bodega/temporada.
        """
        # Crear primera semana abierta
        semana1 = WeekService.start_week(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_desde=date(2026, 1, 6),
            user=self.user,
        )
        
        self.assertIsNotNone(semana1)
        self.assertIsNone(semana1.fecha_hasta)
        
        # Intentar crear segunda semana abierta debe fallar
        with self.assertRaises(DjangoValidationError) as context:
            WeekService.start_week(
                bodega=self.bodega,
                temporada=self.temporada,
                fecha_desde=date(2026, 1, 13),
                user=self.user,
            )
        
        self.assertIn("Ya existe una semana abierta", str(context.exception))

    def test_clamp_7_dias(self):
        """
        Test 2: Cerrar una semana en el día 8 debe automáticamente truncar al día 7.
        """
        # Crear semana
        semana = WeekService.start_week(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_desde=date(2026, 1, 6),
            user=self.user,
        )
        
        # Intentar cerrar en el día 10
        fecha_cierre_solicitada = semana.fecha_desde + timedelta(days=9)
        
        semana_cerrada = WeekService.close_week(
            cierre=semana,
            fecha_hasta=fecha_cierre_solicitada,
            user=self.user,
        )
        
        # Debe estar cerrada en día 7 (fecha_desde + 6)
        fecha_esperada = semana.fecha_desde + timedelta(days=6)
        self.assertEqual(semana_cerrada.fecha_hasta, fecha_esperada)

    def test_recepcion_sin_semana_activa(self):
        """
        Test 3: No se puede crear una Recepción si no hay semana activa que cubra la fecha.
        """
        # Sin semana creada
        recepcion = Recepcion(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha=date(2026, 1, 6),
            huertero_nombre="Productor Test",
            tipo_mango="Kent",
            cajas_campo=100,
        )
        
        with self.assertRaises(ValidationError) as context:
            recepcion.full_clean()
        
        self.assertIn("semana", context.exception.message_dict)

    def test_clasificacion_fuera_de_semana_recepcion(self):
        """
        Test 4: No se puede crear Clasificación con fecha fuera de la semana de su Recepción.
        """
        # Crear semana 1
        semana1 = WeekService.start_week(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_desde=date(2026, 1, 6),
            user=self.user,
        )
        
        # Crear recepción en semana 1
        recepcion = Recepcion.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            semana=semana1,
            fecha=date(2026, 1, 6),
            huertero_nombre="Productor Test",
            tipo_mango="Kent",
            cajas_campo=100,
        )
        
        # Cerrar semana 1
        WeekService.close_week(semana1, date(2026, 1, 12), user=self.user)
        
        # Crear semana 2
        semana2 = WeekService.start_week(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_desde=date(2026, 1, 13),
            user=self.user,
        )
        
        # Intentar crear clasificación con fecha en semana 2 para recepción de semana 1
        clasificacion = ClasificacionEmpaque(
            recepcion=recepcion,
            bodega=self.bodega,
            temporada=self.temporada,
            fecha=date(2026, 1, 13),  # Fecha en semana 2
            material=Material.MADERA,
            calidad="PRIMERA",
            tipo_mango="Kent",
            cantidad_cajas=50,
        )
        
        with self.assertRaises(ValidationError) as context:
            clasificacion.full_clean()
        
        # Debe rechazar por inconsistencia de semana
        self.assertTrue(
            "semana" in context.exception.message_dict or 
            "fecha" in context.exception.message_dict
        )

    def test_overpicking_clasificacion(self):
        """
        Test 5: No se puede clasificar más cajas de las disponibles en la recepción.
        """
        # Crear semana
        semana = WeekService.start_week(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_desde=date(2026, 1, 6),
            user=self.user,
        )
        
        # Crear recepción con 100 cajas
        recepcion = Recepcion.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            semana=semana,
            fecha=date(2026, 1, 6),
            huertero_nombre="Productor Test",
            tipo_mango="Kent",
            cajas_campo=100,
        )
        
        # Crear primera clasificación: 60 cajas
        ClasificacionEmpaque.objects.create(
            recepcion=recepcion,
            bodega=self.bodega,
            temporada=self.temporada,
            semana=semana,
            fecha=date(2026, 1, 6),
            material=Material.MADERA,
            calidad="PRIMERA",
            tipo_mango="Kent",
            cantidad_cajas=60,
        )
        
        # Intentar segunda clasificación: 50 cajas (total = 110, excede 100)
        clasificacion2 = ClasificacionEmpaque(
            recepcion=recepcion,
            bodega=self.bodega,
            temporada=self.temporada,
            semana=semana,
            fecha=date(2026, 1, 6),
            material=Material.MADERA,
            calidad="SEGUNDA",
            tipo_mango="Kent",
            cantidad_cajas=50,
        )
        
        # La validación puede estar en clean() o en el serializer
        # Verificamos que falle en algún punto
        try:
            clasificacion2.full_clean()
            clasificacion2.save()
            self.fail("Se esperaba que fallara por exceder cajas disponibles")
        except (ValidationError, IntegrityError):
            # Correcto: debe fallar
            pass

    def test_recepcion_en_semana_cerrada(self):
        """
        Test 6: No se pueden registrar recepciones en una semana cerrada.
        """
        # Crear y cerrar semana
        semana = WeekService.start_week(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_desde=date(2026, 1, 6),
            user=self.user,
        )
        
        WeekService.close_week(semana, date(2026, 1, 12), user=self.user)
        
        # Intentar crear recepción en semana cerrada
        recepcion = Recepcion(
            bodega=self.bodega,
            temporada=self.temporada,
            semana=semana,
            fecha=date(2026, 1, 6),
            huertero_nombre="Productor Test",
            tipo_mango="Kent",
            cajas_campo=100,
        )
        
        with self.assertRaises(ValidationError) as context:
            recepcion.full_clean()
        
        self.assertIn("semana", context.exception.message_dict)
        self.assertIn("cerrada", str(context.exception).lower())

    def test_clasificacion_en_semana_cerrada(self):
        """
        Test 7: No se pueden registrar clasificaciones en una semana cerrada.
        """
        # Crear semana y recepción
        semana = WeekService.start_week(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_desde=date(2026, 1, 6),
            user=self.user,
        )
        
        recepcion = Recepcion.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            semana=semana,
            fecha=date(2026, 1, 6),
            huertero_nombre="Productor Test",
            tipo_mango="Kent",
            cajas_campo=100,
        )
        
        # Cerrar semana
        WeekService.close_week(semana, date(2026, 1, 12), user=self.user)
        
        # Intentar clasificar en semana cerrada
        clasificacion = ClasificacionEmpaque(
            recepcion=recepcion,
            bodega=self.bodega,
            temporada=self.temporada,
            semana=semana,
            fecha=date(2026, 1, 6),
            material=Material.MADERA,
            calidad="PRIMERA",
            tipo_mango="Kent",
            cantidad_cajas=50,
        )
        
        with self.assertRaises(ValidationError) as context:
            clasificacion.full_clean()
        
        self.assertIn("semana", context.exception.message_dict)
