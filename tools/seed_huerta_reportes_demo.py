from __future__ import annotations

import random
from dataclasses import dataclass
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from gestion_huerta.models import (
    CategoriaInversion,
    Cosecha,
    Huerta,
    InversionesHuerta,
    Propietario,
    Temporada,
    Venta,
)


@dataclass
class CosechaResumen:
    cosecha_id: int
    nombre: str
    ventas: int
    inversiones: int


def run_seed() -> None:
    random.seed(20260308)
    now = timezone.now()
    stamp = now.strftime("%Y%m%d_%H%M%S")
    year = now.year

    propietarios_seed = [
        {
            "nombre": "Rafael",
            "apellidos": f"Morales Seed {stamp}",
            "telefono": "6671203001",
            "direccion": "El Rosario, Sinaloa",
        },
        {
            "nombre": "Claudia",
            "apellidos": f"Parra Seed {stamp}",
            "telefono": "6671203002",
            "direccion": "Escuinapa, Sinaloa",
        },
        {
            "nombre": "Hector",
            "apellidos": f"Zazueta Seed {stamp}",
            "telefono": "6671203003",
            "direccion": "Concordia, Sinaloa",
        },
    ]
    categorias_base = [
        "Fertilizantes",
        "Riego",
        "Mano de obra",
        "Control de plagas",
        "Mantenimiento",
    ]
    tipos_mango = ["Ataulfo", "Kent", "Keitt", "Tommy Atkins"]

    resumen = {
        "propietarios": 0,
        "huertas": 0,
        "temporadas": 0,
        "cosechas": 0,
        "ventas": 0,
        "inversiones": 0,
    }

    with transaction.atomic():
        propietarios = [Propietario.objects.create(**item) for item in propietarios_seed]
        resumen["propietarios"] = len(propietarios)

        huerta = Huerta.objects.create(
            nombre=f"Huerta Demo {stamp}",
            ubicacion="El Walamo, Mazatlan, Sinaloa",
            variedades="Ataulfo, Kent, Keitt",
            historial="Huerta de pruebas para reportes, tablas y graficas.",
            hectareas=12.5,
            propietario=propietarios[0],
        )
        resumen["huertas"] = 1

        temporada = Temporada.objects.create(
            huerta=huerta,
            fecha_inicio=now.date(),
            **{"a\u00f1o": year},
        )
        resumen["temporadas"] = 1

        categorias = []
        for nombre in categorias_base:
            categoria, _ = CategoriaInversion.objects.get_or_create(
                nombre=nombre,
                defaults={"is_active": True},
            )
            categorias.append(categoria)

        cosechas_resumen: list[CosechaResumen] = []
        for idx in range(1, 5):
            cosecha = Cosecha.objects.create(
                nombre=f"Cosecha {idx} {stamp}",
                temporada=temporada,
                huerta=huerta,
            )
            resumen["cosechas"] += 1

            ventas_n = random.randint(10, 20)
            inversiones_n = random.randint(10, 20)

            for n in range(ventas_n):
                Venta.objects.create(
                    fecha_venta=now.date(),
                    num_cajas=random.randint(80, 320),
                    precio_por_caja=random.randint(220, 480),
                    tipo_mango=random.choice(tipos_mango),
                    descripcion=f"Venta #{n + 1} de {cosecha.nombre}",
                    gasto=random.randint(1500, 10000),
                    cosecha=cosecha,
                    temporada=temporada,
                    huerta=huerta,
                )
            resumen["ventas"] += ventas_n

            for n in range(inversiones_n):
                InversionesHuerta.objects.create(
                    categoria=random.choice(categorias),
                    fecha=now.date(),
                    descripcion=f"Inversion #{n + 1} de {cosecha.nombre}",
                    gastos_insumos=Decimal(str(random.randint(1200, 9000))),
                    gastos_mano_obra=Decimal(str(random.randint(1000, 8500))),
                    cosecha=cosecha,
                    temporada=temporada,
                    huerta=huerta,
                )
            resumen["inversiones"] += inversiones_n

            cosechas_resumen.append(
                CosechaResumen(
                    cosecha_id=cosecha.id,
                    nombre=cosecha.nombre,
                    ventas=ventas_n,
                    inversiones=inversiones_n,
                )
            )

    print("SEED_OK")
    print(f"propietarios={resumen['propietarios']}")
    print(f"huerta_id={huerta.id}")
    print(f"temporada_id={temporada.id}")
    print(f"cosechas={resumen['cosechas']}")
    print(f"ventas={resumen['ventas']}")
    print(f"inversiones={resumen['inversiones']}")
    for item in cosechas_resumen:
        print(
            f"cosecha_id={item.cosecha_id} "
            f"nombre='{item.nombre}' "
            f"ventas={item.ventas} "
            f"inversiones={item.inversiones}"
        )


run_seed()
