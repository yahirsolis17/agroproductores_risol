import os
import sys
import django
from django.utils import timezone

sys.path.append(r'C:\Users\Yahir\agroproductores_risol\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agroproductores_risol.settings')
django.setup()

from gestion_bodega.models import (
    Bodega, TemporadaBodega, CierreSemanal, 
    Recepcion, LoteBodega, ClasificacionEmpaque, 
    CamionSalida, CamionItem, CamionConsumoEmpaque
)

def seed():
    print("🌱 Seeding P3 Data (Validando IDs canónicos)...")
    
    # 1. Contexto (usando existentes del test)
    try:
        bodega = Bodega.objects.get(pk=16)
        temporada = TemporadaBodega.objects.get(pk=8)
    except:
        print("❌ No se encontró Bodega 16 o Temporada 8 (datos base del test).")
        return

    # 2. Semana Abierta (Field check: fecha_desde / fecha_hasta)
    # Buscamos o creamos una semana abierta para hoy
    today = timezone.localdate()
    semana, created = CierreSemanal.objects.get_or_create(
        bodega=bodega,
        temporada=temporada,
        fecha_hasta__isnull=True, # Flag: Abierta
        defaults={'fecha_desde': today}
    )
    if created:
        print(f"✅ Semana abierta creada: ID={semana.id} ({semana.fecha_desde})")
    else:
        print(f"ℹ️ Usando semana abierta existente: ID={semana.id} ({semana.fecha_desde})")

    # 3. Recepción (P3: recepcion_id, semana_id, bodega_id, temporada_id)
    recepcion = Recepcion.objects.create(
        bodega=bodega,
        temporada=temporada,
        semana=semana,
        fecha=today, # Fixed: Debe ser hoy para pasar validación (no fecha inicio semana)
        huertero_nombre="Huertero P3 Test",
        cajas_campo=100,
        tipo_mango="KENT"
    )
    print(f"✅ Recepción creada: ID={recepcion.id}")

    # 4. Inventario (P3: lote_id, recepcion_id...)
    # LoteBodega es el PADRE en la FK (Recepcion.lote -> LoteBodega)
    lote = LoteBodega.objects.create(
        bodega=bodega,
        temporada=temporada,
        semana=semana,
        codigo_lote=f"LOT-P3-{timezone.now().timestamp()}",
        origen_nombre="Origen Seed P3"
    )
    
    # Asociamos la recepción al lote (si es que la lógica es esa)
    # OJO: Según models.py: Recepcion.lote FK -> LoteBodega
    recepcion.lote = lote
    recepcion.save()

    clasificacion = ClasificacionEmpaque.objects.create(
        lote=lote,
        calidad="PRIMERA",
        cantidad_cajas=50,
        fecha=timezone.now(),
        is_active=True
    )
    print(f"✅ Inventario creado: Lote ID={lote.id} (Clasif ID={clasificacion.id})")

    # 5. Despacho (P3: camion_id, folio, semana_id...)
    # Simulamos item para el camion (necesario para despacho valido)
    # y consumo
    folio_mock = f"BOD-{bodega.id}-T{temporada.id}-W{semana.id}-C99999"
    camion = CamionSalida.objects.create(
        bodega=bodega,
        temporada=temporada,
        semana=semana,
        fecha_salida=semana.fecha_desde,
        numero=99999,
        estado="CONFIRMADO",
        folio=folio_mock
    )
    # Item para que tenga cajas en el dashboard
    CamionItem.objects.create(
        camion=camion,
        tipo_mango="KENT",
        cantidad_cajas=50,
        calidad="PRIMERA"
    )

    # Consumo (para probar meta.despachado)
    CamionConsumoEmpaque.objects.create(
        camion=camion,
        clasificacion_empaque=clasificacion
    )
    print(f"✅ Camión creado: ID={camion.id} Folio={camion.folio}")
    print(f"✅ Consumo creado: Lote {lote.id} despachado en Camión {camion.id}")

    print("\n🎉 Seed completado! Ejecuta python test_all_endpoints.py para verificar P3 IDs.")

if __name__ == "__main__":
    seed()
