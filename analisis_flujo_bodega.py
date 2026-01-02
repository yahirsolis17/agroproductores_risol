import os
import sys
sys.path.insert(0, r'C:\Users\Yahir\agroproductores_risol\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agroproductores_risol.settings')

import django
django.setup()

from gestion_bodega.models import *
from django.db.models import Count, Sum, Q, Max
from django.db import connection

print("=" * 80)
print("ANÁLISIS EXHAUSTIVO: FLUJO GESTIÓN DE BODEGA")
print("=" * 80)

# 1. JERARQUÍA Y CONTEOS
print("\n### 1. JERARQUÍA DE DATOS (Conteos Actuales) ###\n")
counts = {
    'Bodegas': Bodega.objects.count(),
    'TemporadaBodega': TemporadaBodega.objects.count(),
    'CierreSemanal': CierreSemanal.objects.count(),
    'LoteBodega': LoteBodega.objects.count(),
    'Recepcion': Recepcion.objects.count(),
    'ClasificacionEmpaque': ClasificacionEmpaque.objects.count(),
    'CamionSalida': CamionSalida.objects.count(),
    'CamionConsumoEmpaque': CamionConsumoEmpaque.objects.count(),
    'Pedido': Pedido.objects.count(),
    'SurtidoRenglon': SurtidoRenglon.objects.count(),
}

for modelo, count in counts.items():
    print(f"{modelo:25} {count:5} registros")

# 2. ANÁLISIS DE CONTEXTO: IDs que se propagan
print("\n### 2. ANÁLISIS DE CONTEXTO (Propagación de IDs) ###\n")

# Bodega → Temporada
print("NIVEL 1: Bodega → Temporada")
for bodega in Bodega.objects.filter(is_active=True)[:3]:
    temps = TemporadaBodega.objects.filter(bodega=bodega, is_active=True)
    print(f"  Bodega[{bodega.id}] '{bodega.nombre}' → {temps.count()} temporadas")
    for temp in temps[:2]:
        print(f"    ├─ Temporada[{temp.id}] (Año disponible en detalles)")

# Temporada → Semana
print("\nNIVEL 2: Temporada → Semana")
for temp in TemporadaBodega.objects.filter(is_active=True)[:3]:
    semanas = CierreSemanal.objects.filter(temporada=temp, is_active=True)
    abiertas = semanas.filter(fecha_hasta__isnull=True).count()
    cerradas = semanas.filter(fecha_hasta__isnull=False).count()
    print(f"  Temporada[{temp.id}] (Bodega:{temp.bodega_id}) → {semanas.count()} semanas")
    print(f"    ├─ Abiertas: {abiertas}, Cerradas: {cerradas}")

# Semana → Recepciones
print("\nNIVEL 3: Semana → Recepciones")
for semana in CierreSemanal.objects.filter(is_active=True)[:5]:
    recs = Recepcion.objects.filter(semana=semana, is_active=True)
    print(f"  Semana[{semana.id}] Bodega:{semana.bodega_id}, Temp:{semana.temporada_id}")
    print(f"    ├─ Recepciones: {recs.count()}")
    total_cajas = recs.aggregate(t=Sum('cantidad_cajas'))['t'] or 0
    print(f"    ├─ Total cajas recibidas: {total_cajas}")

# Recepción → Clasificaciones
print("\nNIVEL 4: Recepción → Clasificaciones")
for rec in Recepcion.objects.select_related('bodega', 'temporada', 'semana', 'lote').filter(is_active=True)[:5]:
    clasif = ClasificacionEmpaque.objects.filter(recepcion=rec, is_active=True)
    print(f"  Recepción[{rec.id}]:")
    print(f"    ├─ Contexto: Bodega:{rec.bodega_id}, Temp:{rec.temporada_id}, Semana:{rec.semana_id}, Lote:{rec.lote_id}")
    print(f"    ├─ Cajas recibidas: {rec.cantidad_cajas}")
    print(f"    ├─ Clasificaciones hijas: {clasif.count()}")
    total_clasificado = clasif.aggregate(t=Sum('cantidad_cajas'))['t'] or 0
    print(f"    └─ Total clasificado: {total_clasificado} cajas")

# 3. VALIDACIÓN DE CONSISTENCIA
print("\n### 3. VALIDACIÓN DE CONSISTENCIA DE IDS ###\n")

# Verificar que clasificaciones heredan IDs de recepción
print("CHECK: Clasificaciones heredan contexto de Recepción")
inconsistentes = []
for clasif in ClasificacionEmpaque.objects.select_related('recepcion').filter(is_active=True, recepcion__isnull=False):
    if clasif.bodega_id != clasif.recepcion.bodega_id:
        inconsistentes.append(f"  ❌ Clasif[{clasif.id}]: bodega_id={clasif.bodega_id} != recepcion.bodega_id={clasif.recepcion.bodega_id}")
    if clasif.temporada_id != clasif.recepcion.temporada_id:
        inconsistentes.append(f"  ❌ Clasif[{clasif.id}]: temporada_id={clasif.temporada_id} != recepcion.temporada_id={clasif.recepcion.temporada_id}")
    if clasif.semana_id != clasif.recepcion.semana_id:
        inconsistentes.append(f"  ❌ Clasif[{clasif.id}]: semana_id={clasif.semana_id} != recepcion.semana_id={clasif.recepcion.semana_id}")

if inconsistentes:
    for err in inconsistentes[:10]:
        print(err)
else:
    print("  ✅ TODAS las clasificaciones tienen IDs consistentes con su recepción")

# Verificar que recepciones están en semanas válidas
print("\nCHECK: Recepciones están en semanas válidas")
invalidas = []
for rec in Recepcion.objects.select_related('semana').filter(is_active=True, semana__isnull=False):
    if rec.bodega_id != rec.semana.bodega_id:
        invalidas.append(f"  ❌ Recep[{rec.id}]: bodega_id={rec.bodega_id} != semana.bodega_id={rec.semana.bodega_id}")
    if rec.temporada_id != rec.semana.temporada_id:
        invalidas.append(f"  ❌ Recep[{rec.id}]: temporada_id={rec.temporada_id} != semana.temporada_id={rec.semana.temporada_id}")

if invalidas:
    for err in invalidas[:10]:
        print(err)
else:
    print("  ✅ TODAS las recepciones tienen IDs consistentes con su semana")

# 4. CONSTRAINTS DE UNICIDAD
print("\n### 4. VERIFICACIÓN DE CONSTRAINTS ###\n")

# Semanas abiertas (debe haber máximo 1 por bodega+temporada)
print("CHECK: Máximo 1 semana abierta por (bodega, temporada)")
duplicadas = CierreSemanal.objects.filter(
    fecha_hasta__isnull=True,
    is_active=True
).values('bodega_id', 'temporada_id').annotate(
    count=Count('id')
).filter(count__gt=1)

if duplicadas.exists():
    for dup in duplicadas:
        print(f"  ❌ Bodega:{dup['bodega_id']}, Temporada:{dup['temporada_id']} → {dup['count']} semanas abiertas")
else:
    print("  ✅ OK: No hay duplicados de semanas abiertas")

# 5. INTEGRIDAD DE DATOS (overpicking)
print("\n### 5. INTEGRIDAD: Overpicking (Clasificación > Recepción) ###\n")

overpick = []
for rec in Recepcion.objects.filter(is_active=True):
    total_clasif = ClasificacionEmpaque.objects.filter(
        recepcion=rec,
        is_active=True
    ).aggregate(t=Sum('cantidad_cajas'))['t'] or 0
    
    if total_clasif > rec.cantidad_cajas:
        overpick.append(f"  ❌ Recep[{rec.id}]: Recibidas={rec.cantidad_cajas}, Clasificadas={total_clasif} (OVER by {total_clasif - rec.cantidad_cajas})")

if overpick:
    for err in overpick[:10]:
        print(err)
else:
    print("  ✅ OK: No hay overpicking detectado")

# 6. LOTES: Trazabilidad
print("\n### 6. TRAZABILIDAD: LoteBodega ###\n")

for lote in LoteBodega.objects.select_related('bodega', 'temporada', 'semana').filter(is_active=True)[:5]:
    recs_lote = Recepcion.objects.filter(lote=lote, is_active=True).count()
    clasif_lote = ClasificacionEmpaque.objects.filter(lote=lote, is_active=True).count()
    print(f"Lote[{lote.id}] '{lote.codigo_lote}':")
    print(f"  ├─ Contexto: Bodega:{lote.bodega_id}, Temp:{lote.temporada_id}, Semana:{lote.semana_id}")
    print(f"  ├─ Origen: {lote.origen_nombre}")
    print(f"  ├─ Recepciones: {recs_lote}")
    print(f"  └─ Clasificaciones: {clasif_lote}")

# 7. CAMIONES: Consumo de Stock
print("\n### 7. STOCK REAL: CamionConsumoEmpaque ###\n")

for camion in CamionSalida.objects.filter(is_active=True)[:5]:
    consumos = CamionConsumoEmpaque.objects.filter(camion=camion, is_active=True)
    total_cajas = consumos.aggregate(t=Sum('cantidad'))['t'] or 0
    print(f"Camión[{camion.id}] Placas:{camion.placas}, Estado:{camion.estado}")
    print(f"  ├─ Contexto: Bodega:{camion.bodega_id}, Temp:{camion.temporada_id}")
    print(f"  ├─ Cargas (CamionConsumoEmpaque): {consumos.count()}")
    print(f"  └─ Total cajas cargadas: {total_cajas}")
    
    for consumo in consumos[:3]:
        print(f"      → Clasificación[{consumo.clasificacion_empaque_id}]: {consumo.cantidad} cajas")

# 8. ESTADOS DE SEMANAS
print("\n### 8. MÁQUINA DE ESTADOS: Semanas ###\n")

semanas = CierreSemanal.objects.all()
abiertas_total = semanas.filter(fecha_hasta__isnull=True, is_active=True).count()
cerradas_total = semanas.filter(fecha_hasta__isnull=False, is_active=True).count()
archivadas_total = semanas.filter(is_active=False).count()

print(f"Estados de Semanas:")
print(f"  ├─ ABIERTAS (fecha_hasta=NULL): {abiertas_total}")
print(f"  ├─ CERRADAS (fecha_hasta!=NULL): {cerradas_total}")
print(f"  └─ ARCHIVADAS (is_active=False): {archivadas_total}")

# Mostrar semanas abiertas con análisis de "vencimiento"
from django.utils import timezone
from datetime import timedelta

print("\nAnálisis de Semanas Abiertas (detección de vencidas):")
for semana in CierreSemanal.objects.filter(fecha_hasta__isnull=True, is_active=True):
    fecha_limite_teorica = semana.fecha_desde + timedelta(days=6)
    hoy = timezone.localdate()
    dias_desde_inicio = (hoy - semana.fecha_desde).days
    
    estado = "🟢 VIGENTE" if dias_desde_inicio <= 6 else "🔴 VENCIDA"
    print(f"  Semana[{semana.id}]: Inicio={semana.fecha_desde}, Días transcurridos={dias_desde_inicio} → {estado}")

print("\n" + "=" * 80)
print("FIN DEL ANÁLISIS")
print("=" * 80)
