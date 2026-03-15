from __future__ import annotations

import random
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from gestion_huerta.models import (
    CategoriaInversion,
    Cosecha,
    InversionesHuerta,
    Temporada,
    Venta,
)


def get_target_cosechas() -> list[Cosecha]:
    temporada = (
        Temporada.objects.filter(is_active=True, finalizada=False)
        .order_by("-id")
        .first()
    )
    if temporada is None:
        return []
    return list(
        Cosecha.objects.filter(temporada=temporada, is_active=True).order_by("id")
    )


def ensure_categories() -> list[CategoriaInversion]:
    names = [
        "Fertilizantes",
        "Riego",
        "Mano de obra",
        "Control de plagas",
        "Mantenimiento",
        "Transporte interno",
        "Podas y limpieza",
    ]
    categorias: list[CategoriaInversion] = []
    for nombre in names:
        categoria, _ = CategoriaInversion.objects.get_or_create(
            nombre=nombre,
            defaults={"is_active": True},
        )
        if not categoria.is_active:
            categoria.is_active = True
            categoria.archivado_en = None
            categoria.save(update_fields=["is_active", "archivado_en"])
        categorias.append(categoria)
    return categorias


def run() -> None:
    random.seed(20260309)
    today = timezone.now().date()
    tipos_mango = ["Ataulfo", "Kent", "Keitt", "Tommy Atkins"]

    cosechas = get_target_cosechas()
    if not cosechas:
        print("NO_TARGET_COSECHAS")
        return

    categorias = ensure_categories()
    before = {}
    for cosecha in cosechas:
        before[cosecha.id] = {
            "ventas": Venta.objects.filter(cosecha=cosecha, is_active=True).count(),
            "inversiones": InversionesHuerta.objects.filter(
                cosecha=cosecha, is_active=True
            ).count(),
        }

    totals = {"ventas_added": 0, "inversiones_added": 0}
    with transaction.atomic():
        for cosecha in cosechas:
            ventas_add = random.randint(10, 16)
            inversiones_add = random.randint(12, 20)

            for i in range(ventas_add):
                fecha = today - timedelta(days=(i * 3) + random.randint(0, 4))
                Venta.objects.create(
                    fecha_venta=fecha,
                    num_cajas=random.randint(120, 420),
                    precio_por_caja=random.randint(240, 520),
                    tipo_mango=random.choice(tipos_mango),
                    descripcion=f"Venta adicional grafica #{i + 1} - {cosecha.nombre}",
                    gasto=random.randint(4000, 24000),
                    cosecha=cosecha,
                    temporada=cosecha.temporada,
                    huerta=cosecha.huerta,
                    huerta_rentada=cosecha.huerta_rentada,
                )

            for i in range(inversiones_add):
                fecha = today - timedelta(days=(i * 2) + random.randint(0, 3))
                InversionesHuerta.objects.create(
                    categoria=random.choice(categorias),
                    fecha=fecha,
                    descripcion=(
                        f"Inversion adicional grafica #{i + 1} - {cosecha.nombre}"
                    ),
                    gastos_insumos=Decimal(str(random.randint(6000, 26000))),
                    gastos_mano_obra=Decimal(str(random.randint(4500, 20000))),
                    cosecha=cosecha,
                    temporada=cosecha.temporada,
                    huerta=cosecha.huerta,
                    huerta_rentada=cosecha.huerta_rentada,
                )

            totals["ventas_added"] += ventas_add
            totals["inversiones_added"] += inversiones_add

    print("AMPLIACION_OK")
    print(f"cosechas_objetivo={len(cosechas)}")
    print(f"ventas_agregadas={totals['ventas_added']}")
    print(f"inversiones_agregadas={totals['inversiones_added']}")

    for cosecha in cosechas:
        after_ventas = Venta.objects.filter(cosecha=cosecha, is_active=True).count()
        after_inversiones = InversionesHuerta.objects.filter(
            cosecha=cosecha, is_active=True
        ).count()
        print(
            f"cosecha_id={cosecha.id} "
            f"nombre='{cosecha.nombre}' "
            f"ventas_before={before[cosecha.id]['ventas']} "
            f"ventas_after={after_ventas} "
            f"inversiones_before={before[cosecha.id]['inversiones']} "
            f"inversiones_after={after_inversiones}"
        )


run()
