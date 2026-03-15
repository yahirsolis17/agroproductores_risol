from __future__ import annotations

import json
import os
import sys
from dataclasses import asdict, dataclass
from datetime import timedelta
from decimal import Decimal
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parent
REPO_ROOT = BACKEND_DIR.parent


def bootstrap_django() -> None:
    if str(BACKEND_DIR) not in sys.path:
        sys.path.insert(0, str(BACKEND_DIR))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "agroproductores_risol.settings")
    import django

    django.setup()


@dataclass
class SmokeContext:
    user_id: int
    bodega_id: int
    temporada_id: int
    semana_id: int
    semana_iso: str

    def to_json(self) -> str:
        return json.dumps(asdict(self), indent=2)


def ensure_smoke_context() -> SmokeContext:
    bootstrap_django()

    from django.db import transaction
    from django.utils import timezone

    from gestion_bodega.models import (
        Bodega,
        CamionConsumoEmpaque,
        CamionSalida,
        CierreSemanal,
        ClasificacionEmpaque,
        CompraMadera,
        Consumible,
        EstadoCamion,
        Material,
        Recepcion,
        TemporadaBodega,
    )
    from gestion_usuarios.models import Users

    today = timezone.localdate()
    iso = today.isocalendar()
    semana_iso = f"{iso.year}-W{iso.week:02d}"
    week_start = today - timedelta(days=today.weekday())

    user = Users.objects.filter(is_superuser=True, is_active=True).order_by("id").first()
    if not user:
        user = Users.objects.create_superuser(
            telefono="5550000999",
            password="SmokePass2026",
            nombre="Smoke",
            apellido="Admin",
        )

    bodega, _ = Bodega.objects.get_or_create(
        nombre="Bodega Smoke QA",
        defaults={"ubicacion": "Seed Local"},
    )
    temporada, _ = TemporadaBodega.objects.get_or_create(
        bodega=bodega,
        año=today.year,
        defaults={"fecha_inicio": week_start, "finalizada": False},
    )
    if not temporada.is_active:
        temporada.desarchivar()
    if temporada.finalizada:
        temporada.finalizada = False
        temporada.fecha_fin = None
        temporada.save(update_fields=["finalizada", "fecha_fin"])

    semana, created = CierreSemanal.objects.get_or_create(
        bodega=bodega,
        temporada=temporada,
        fecha_desde=week_start,
        defaults={"fecha_hasta": None, "iso_semana": semana_iso, "locked_by": user},
    )
    if not created and semana.fecha_hasta is not None:
        semana.fecha_hasta = None
        semana.locked_by = user
        semana.save(update_fields=["fecha_hasta", "locked_by", "actualizado_en"])

    recepcion, _ = Recepcion.objects.get_or_create(
        bodega=bodega,
        temporada=temporada,
        semana=semana,
        fecha=today,
        huertero_nombre="Smoke QA Productor",
        tipo_mango="Ataulfo",
        defaults={"cajas_campo": 120},
    )
    if recepcion.cajas_campo < 120:
        recepcion.cajas_campo = 120
        recepcion.save(update_fields=["cajas_campo"])

    clasificacion, _ = ClasificacionEmpaque.objects.get_or_create(
        recepcion=recepcion,
        bodega=bodega,
        temporada=temporada,
        semana=semana,
        fecha=today,
        material=Material.MADERA,
        calidad="PRIMERA",
        defaults={"tipo_mango": recepcion.tipo_mango, "cantidad_cajas": 80},
    )
    if clasificacion.cantidad_cajas != 80:
        clasificacion.cantidad_cajas = 80
        clasificacion.save(update_fields=["cantidad_cajas"])

    compra, _ = CompraMadera.objects.get_or_create(
        bodega=bodega,
        temporada=temporada,
        proveedor_nombre="Proveedor Smoke QA",
        defaults={
            "cantidad_cajas": Decimal("200.00"),
            "precio_unitario": Decimal("10.00"),
        },
    )
    if compra.stock_actual < Decimal("80.00"):
        compra.stock_actual = Decimal("120.00")
        compra.hay_stock = True
        compra.save(update_fields=["stock_actual", "hay_stock", "actualizado_en"])

    Consumible.objects.get_or_create(
        bodega=bodega,
        temporada=temporada,
        fecha=today,
        concepto="Rafia Smoke QA",
        defaults={"cantidad": 5, "costo_unitario": Decimal("12.00")},
    )

    camion = CamionSalida.objects.filter(
        bodega=bodega,
        temporada=temporada,
        destino="Destino Smoke QA",
        fecha_salida=today,
        is_active=True,
    ).order_by("id").first()
    if camion is None:
        camion = CamionSalida.objects.create(
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            fecha_salida=today,
            chofer="Chofer Smoke QA",
            destino="Destino Smoke QA",
        )

    if not CamionConsumoEmpaque.objects.filter(
        camion=camion,
        clasificacion_empaque=clasificacion,
        is_active=True,
    ).exists():
        CamionConsumoEmpaque.objects.create(
            camion=camion,
            clasificacion_empaque=clasificacion,
            cantidad=30,
        )

    if camion.estado != EstadoCamion.CONFIRMADO:
        with transaction.atomic():
            camion.confirmar()
        camion.refresh_from_db()

    return SmokeContext(
        user_id=user.id,
        bodega_id=bodega.id,
        temporada_id=temporada.id,
        semana_id=semana.id,
        semana_iso=semana.iso_semana,
    )
