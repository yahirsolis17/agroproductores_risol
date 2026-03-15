from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase

from gestion_bodega.models import (
    Bodega,
    CierreSemanal,
    ClasificacionEmpaque,
    Material,
    Recepcion,
    TemporadaBodega,
)
from gestion_bodega.services.week_service import WeekService


User = get_user_model()


class WeekIntegrityTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            telefono="5551111111",
            password="password",
            nombre="Tester",
            apellido="Semanas",
            role="usuario",
        )
        self.bodega = Bodega.objects.create(nombre="Bodega Test", ubicacion="Ubicacion Test")
        self.temporada = TemporadaBodega.objects.create(
            bodega=self.bodega,
            año=2026,
            fecha_inicio=date(2026, 1, 1),
        )

    def test_duplicate_active_season_is_blocked(self):
        TemporadaBodega.objects.create(
            bodega=self.bodega,
            año=2027,
            fecha_inicio=date(2027, 1, 1),
        )
        with self.assertRaises(ValidationError) as context:
            TemporadaBodega.objects.create(
                bodega=self.bodega,
                año=2027,
                fecha_inicio=date(2027, 2, 1),
            )
        self.assertIn("año", context.exception.message_dict)

    def test_unicidad_semana_abierta(self):
        start = date.today()
        week = WeekService.start_week(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_desde=start,
            user=self.user,
        )
        self.assertIsNotNone(week)
        self.assertIsNone(week.fecha_hasta)

        with self.assertRaises(ValidationError) as context:
            WeekService.start_week(
                bodega=self.bodega,
                temporada=self.temporada,
                fecha_desde=start + timedelta(days=7),
                user=self.user,
            )
        self.assertIn("Ya existe una semana abierta", str(context.exception))

    def test_close_week_clamps_to_seven_days(self):
        week = WeekService.start_week(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_desde=date(2026, 1, 6),
            user=self.user,
        )
        closed = WeekService.close_week(
            cierre=week,
            fecha_hasta=week.fecha_desde + timedelta(days=9),
            user=self.user,
        )
        self.assertEqual(closed.fecha_hasta, week.fecha_desde + timedelta(days=6))

    def test_recepcion_requires_active_week_covering_date(self):
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

    def test_recepcion_in_closed_week_is_blocked(self):
        week = WeekService.start_week(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_desde=date(2026, 1, 6),
            user=self.user,
        )
        WeekService.close_week(week, date(2026, 1, 12), user=self.user)

        recepcion = Recepcion(
            bodega=self.bodega,
            temporada=self.temporada,
            semana=week,
            fecha=date(2026, 1, 6),
            huertero_nombre="Productor Test",
            tipo_mango="Kent",
            cajas_campo=100,
        )
        with self.assertRaises(ValidationError) as context:
            recepcion.full_clean()
        self.assertIn("semana", context.exception.message_dict)

    def test_clasificacion_must_stay_inside_recepcion_week(self):
        week1 = WeekService.start_week(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_desde=date(2026, 1, 6),
            user=self.user,
        )
        recepcion = Recepcion.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            semana=week1,
            fecha=date(2026, 1, 6),
            huertero_nombre="Productor Test",
            tipo_mango="Kent",
            cajas_campo=100,
        )
        WeekService.close_week(week1, date(2026, 1, 12), user=self.user)
        week2 = WeekService.start_week(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_desde=date(2026, 1, 13),
            user=self.user,
        )

        clasificacion = ClasificacionEmpaque(
            recepcion=recepcion,
            bodega=self.bodega,
            temporada=self.temporada,
            semana=week2,
            fecha=date(2026, 1, 13),
            material=Material.MADERA,
            calidad="PRIMERA",
            tipo_mango="Kent",
            cantidad_cajas=50,
        )
        with self.assertRaises(ValidationError) as context:
            clasificacion.full_clean()
        self.assertTrue(
            "semana" in context.exception.message_dict
            or "fecha" in context.exception.message_dict
        )

    def test_overpacking_is_blocked(self):
        week = WeekService.start_week(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_desde=date(2026, 1, 6),
            user=self.user,
        )
        recepcion = Recepcion.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            semana=week,
            fecha=date(2026, 1, 6),
            huertero_nombre="Productor Test",
            tipo_mango="Kent",
            cajas_campo=100,
        )
        ClasificacionEmpaque.objects.create(
            recepcion=recepcion,
            bodega=self.bodega,
            temporada=self.temporada,
            semana=week,
            fecha=date(2026, 1, 6),
            material=Material.MADERA,
            calidad="PRIMERA",
            tipo_mango="Kent",
            cantidad_cajas=60,
        )

        with self.assertRaises(ValidationError) as context:
            ClasificacionEmpaque.objects.create(
                recepcion=recepcion,
                bodega=self.bodega,
                temporada=self.temporada,
                semana=week,
                fecha=date(2026, 1, 6),
                material=Material.MADERA,
                calidad="SEGUNDA",
                tipo_mango="Kent",
                cantidad_cajas=50,
            )
        self.assertIn("cantidad_cajas", context.exception.message_dict)

    def test_clasificacion_in_closed_week_is_blocked(self):
        week = WeekService.start_week(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_desde=date(2026, 1, 6),
            user=self.user,
        )
        recepcion = Recepcion.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            semana=week,
            fecha=date(2026, 1, 6),
            huertero_nombre="Productor Test",
            tipo_mango="Kent",
            cajas_campo=100,
        )
        WeekService.close_week(week, date(2026, 1, 12), user=self.user)

        clasificacion = ClasificacionEmpaque(
            recepcion=recepcion,
            bodega=self.bodega,
            temporada=self.temporada,
            semana=week,
            fecha=date(2026, 1, 6),
            material=Material.MADERA,
            calidad="PRIMERA",
            tipo_mango="Kent",
            cantidad_cajas=50,
        )
        with self.assertRaises(ValidationError) as context:
            clasificacion.full_clean()
        self.assertIn("semana", context.exception.message_dict)

    def test_cierre_semana_disallows_overlap(self):
        CierreSemanal.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_desde=date(2026, 1, 6),
            fecha_hasta=date(2026, 1, 12),
        )
        with self.assertRaises(ValidationError) as context:
            CierreSemanal.objects.create(
                bodega=self.bodega,
                temporada=self.temporada,
                fecha_desde=date(2026, 1, 10),
                fecha_hasta=date(2026, 1, 16),
            )
        self.assertIn("fecha_desde", context.exception.message_dict)
