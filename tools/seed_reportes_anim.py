from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from gestion_bodega.models import (
    Bodega,
    CierreSemanal,
    ClasificacionEmpaque,
    CompraMadera,
    LoteBodega,
    Recepcion,
    TemporadaBodega,
)


def run() -> None:
    hoy = timezone.localdate()
    lunes = hoy - timedelta(days=hoy.weekday())
    domingo = lunes + timedelta(days=6)
    iso = lunes.isocalendar()
    iso_code = f"{iso.year}-W{str(iso.week).zfill(2)}"
    tag = f"seed_anim_reportes_{iso_code}"

    bodega = Bodega.objects.filter(is_active=True).order_by("id").first()
    if not bodega:
        bodega = Bodega.objects.create(nombre="Bodega Demo QA", ubicacion="Local")

    temporada = (
        TemporadaBodega.objects.filter(
            bodega=bodega,
            is_active=True,
            finalizada=False,
        )
        .order_by("-id")
        .first()
    )
    if not temporada:
        temporada = TemporadaBodega(bodega=bodega, fecha_inicio=lunes, finalizada=False)
        setattr(temporada, "a\u00f1o", hoy.year)
        temporada.save()

    semana = (
        CierreSemanal.objects.filter(
            bodega=bodega,
            temporada=temporada,
            is_active=True,
            fecha_hasta__isnull=True,
        )
        .order_by("-fecha_desde")
        .first()
    )
    if not semana:
        semana = (
            CierreSemanal.objects.filter(
                bodega=bodega,
                temporada=temporada,
                is_active=True,
                iso_semana=iso_code,
            )
            .order_by("-id")
            .first()
        )
    if not semana:
        semana = CierreSemanal.objects.create(
            bodega=bodega,
            temporada=temporada,
            fecha_desde=lunes,
            fecha_hasta=None,
            iso_semana=iso_code,
        )

    lote_code = f"ANIM-{iso_code.replace('-', '')}"
    lote, _ = LoteBodega.objects.get_or_create(
        bodega=bodega,
        temporada=temporada,
        codigo_lote=lote_code,
        defaults={
            "semana": semana,
            "origen_nombre": "Carga QA animaciones",
            "notas": "Datos para probar graficas/animaciones en reportes bodega",
        },
    )
    if lote.semana_id != semana.id:
        lote.semana = semana
        lote.save(update_fields=["semana", "actualizado_en"])

    created_recepciones: list[int] = []
    created_clasificaciones = 0

    tipos = ["Ataulfo", "Kent", "Tommy", "Keitt"]
    calidades_madera = ["PRIMERA", "SEGUNDA", "EXTRA", "TERCERA"]
    calidades_plastico = ["PRIMERA", "SEGUNDA", "MERMA"]

    base_n = Recepcion.objects.filter(huertero_nombre__startswith="QA Anim Seed").count()

    for i in range(20):
        seq = base_n + i + 1
        fecha = lunes + timedelta(days=(i % 7))
        tipo = tipos[i % len(tipos)]
        cajas = 70 + ((i * 9) % 95)

        rec = Recepcion.objects.create(
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            fecha=fecha,
            huertero_nombre=f"QA Anim Seed {seq:03d}",
            tipo_mango=tipo,
            cajas_campo=cajas,
            lote=lote,
            observaciones=tag,
        )
        created_recepciones.append(rec.id)

        cajas_madera = max(1, int(cajas * 0.42))
        cajas_plastico = max(1, int(cajas * 0.28))

        ClasificacionEmpaque.objects.create(
            recepcion=rec,
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            fecha=fecha,
            material="MADERA",
            calidad=calidades_madera[i % len(calidades_madera)],
            tipo_mango=tipo,
            cantidad_cajas=cajas_madera,
            lote=lote,
        )
        ClasificacionEmpaque.objects.create(
            recepcion=rec,
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            fecha=fecha,
            material="PLASTICO",
            calidad=calidades_plastico[i % len(calidades_plastico)],
            tipo_mango=tipo,
            cantidad_cajas=cajas_plastico,
            lote=lote,
        )
        created_clasificaciones += 2

    compra = CompraMadera.objects.create(
        bodega=bodega,
        temporada=temporada,
        proveedor_nombre="Proveedor QA Anim",
        cantidad_cajas=Decimal("250.00"),
        precio_unitario=Decimal("35.00"),
        observaciones=tag,
    )

    rec_semana = Recepcion.objects.filter(
        bodega=bodega,
        temporada=temporada,
        fecha__range=(lunes, domingo),
        is_active=True,
    ).count()

    clas_semana = ClasificacionEmpaque.objects.filter(
        bodega=bodega,
        temporada=temporada,
        fecha__range=(lunes, domingo),
        is_active=True,
    ).count()

    stock_madera = (
        CompraMadera.objects.filter(
            bodega=bodega,
            temporada=temporada,
            is_active=True,
            hay_stock=True,
        ).aggregate(total=Sum("stock_actual"))["total"]
        or Decimal("0.00")
    )

    print("--- SEED COMPLETADO ---")
    print(f"Bodega: {bodega.id} | Temporada: {temporada.id} | Semana: {semana.id} ({iso_code})")
    print(
        "Recepciones nuevas: "
        f"{len(created_recepciones)} | rango IDs: {created_recepciones[0]}..{created_recepciones[-1]}"
    )
    print(f"Clasificaciones nuevas: {created_clasificaciones}")
    print(
        "CompraMadera nueva: "
        f"{compra.id} | stock_inicial={compra.stock_inicial} | stock_actual={compra.stock_actual}"
    )
    print(f"Total recepciones semana actual: {rec_semana}")
    print(f"Total clasificaciones semana actual: {clas_semana}")
    print(f"Stock madera activo acumulado: {stock_madera}")


run()
