import os, sys
sys.path.insert(0, r'C:\Users\Yahir\agroproductores_risol\backend')
sys.stdout.reconfigure(encoding='utf-8')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agroproductores_risol.settings')
import django
django.setup()

from gestion_bodega.models import *
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import timedelta

# Redirect stdout to a file
sys.stdout = open(r'C:\Users\Yahir\agroproductores_risol\analisis_result.txt', 'w', encoding='utf-8')

print("="*100)
print(" INFORME EXHAUSTIVO: FLUJO COMPLETO DE GESTIÓN DE BODEGA ".center(100, "="))
print("="*100)

# 1. CONTEOS Y ESTADO GLOBAL
print("\n" + "▶ SECCIÓN 1: INVENTARIO DE DATOS".center(100, "-"))
print("\nTabla                    | Registros | Activos | Archivados")
print("-" * 70)

modelos = [
    ('Bodega', Bodega),
    ('TemporadaBodega', TemporadaBodega),
    ('CierreSemanal', CierreSemanal),
    ('LoteBodega', LoteBodega),
    ('Recepcion', Recepcion),
    ('ClasificacionEmpaque', ClasificacionEmpaque),
    ('CamionSalida', CamionSalida),
    ('CamionConsumoEmpaque', CamionConsumoEmpaque),
]

for nombre, modelo in modelos:
    total = modelo.objects.count()
    activos = modelo.objects.filter(is_active=True).count()
    archivados = total - activos
    print(f"{nombre:25} | {total:^9} | {activos:^7} | {archivados:^10}")

# 2. JERARQUÍA Y PROPAGACIÓN DE IDS
print("\n" + "▶ SECCIÓN 2: PROPAGACIÓN DE CONTEXTO (IDs Padre → Hijo)".center(100, "-"))

print("\n[NIVEL 1] Bodega → Temporada:")
for bodega in Bodega.objects.filter(is_active=True)[:3]:
    temps_count = TemporadaBodega.objects.filter(bodega=bodega, is_active=True).count()
    print(f"  📦 Bodega[ID={bodega.id}] '{bodega.nombre}'")
    print(f"     └─ Temporadas activas: {temps_count}")

print("\n[NIVEL 2] Temporada → Semana:")
for temp in TemporadaBodega.objects.filter(is_active=True)[:3]:
    semanas = CierreSemanal.objects.filter(temporada=temp, is_active=True)
    abiertas = semanas.filter(fecha_hasta__isnull=True).count()
    cerradas = semanas.filter(fecha_hasta__isnull=False).count()
    print(f"  📅 Temporada[ID={temp.id}] (Bodega_ID={temp.bodega_id})")
    print(f"     ├─ Semanas totales: {semanas.count()}")
    print(f"     ├─ Abiertas: {abiertas}")
    print(f"     └─ Cer radas: {cerradas}")

print("\n[NIVEL 3] Semana → Recepciones:")
for semana in CierreSemanal.objects.filter(is_active=True)[:3]:
    recs = Recepcion.objects.filter(semana=semana, is_active=True)
    total_cajas = recs.aggregate(t=Sum('cajas_campo'))['t'] or 0
    print(f"  📦 Semana[ID={semana.id}] (Bodega={semana.bodega_id}, Temporada={semana.temporada_id})")
    print(f"     ├─ Período: {semana.fecha_desde} → {semana.fecha_hasta or '(abierta)'}")
    print(f"     ├─ Recepciones: {recs.count()}")
    print(f"     └─ Total cajas: {total_cajas}")

print("\n[NIVEL 4] Recepción → Clasificaciones:")
for rec in Recepcion.objects.filter(is_active=True)[:3]:
    clasifs = ClasificacionEmpaque.objects.filter(recepcion=rec, is_active=True)
    total_clasif = clasifs.aggregate(t=Sum('cantidad_cajas'))['t'] or 0
    print(f"  📥 Recepción[ID={rec.id}]")
    print(f"     ├─ Contexto: Bodega={rec.bodega_id}, Temp={rec.temporada_id}, Semana={rec.semana_id}")
    print(f"     ├─ Lote: {rec.lote_id or 'N/A'}")
    print(f"     ├─ Cajas recibidas: {rec.cajas_campo}")
    print(f"     ├─ Clasificaciones: {clasifs.count()}")
    print(f"     └─ Total clasificado: {total_clasif}")

# 3. VALIDACIONES DE CONSISTENCIA
print("\n" + "▶ SECCIÓN 3: VALIDACIÓN DE INTEGRIDAD DE IDs".center(100, "-"))

print("\n[CHECK 1] Clasificaciones heredan IDs de Recepción:")
inconsistencias = []
for c in ClasificacionEmpaque.objects.select_related('recepcion').filter(is_active=True, recepcion__isnull=False):
    if c.bodega_id != c.recepcion.bodega_id:
        inconsistencias.append(f"  ❌ Clasif[{c.id}]: bodega={c.bodega_id} != recv_bodega={c.recepcion.bodega_id}")
    if c.temporada_id != c.recepcion.temporada_id:
        inconsistencias.append(f"  ❌ Clasif[{c.id}]: temp={c.temporada_id} != recv_temp={c.recepcion.temporada_id}")
    if c.semana_id != c.recepcion.semana_id:
        inconsistencias.append(f"  ❌ Clasif[{c.id}]: semana={c.semana_id} != recv_semana={c.recepcion.semana_id}")

if inconsistencias:
    for err in inconsistencias[:5]:
        print(err)
    if len(inconsistencias) > 5:
        print(f"  ... y {len(inconsistencias) - 5} más")
else:
    print("  ✅ CORRECTO: Todas las clasificaciones tienen IDs consistentes")

print("\n[CHECK 2] Recepciones están en semanas válidas:")
invalidas = []
for r in Recepcion.objects.select_related('semana').filter(is_active=True, semana__isnull=False):
    if r.bodega_id != r.semana.bodega_id:
        invalidas.append(f"  ❌ Recv[{r.id}]: bodega={r.bodega_id} != semana_bodega={r.semana.bodega_id}")
    if r.temporada_id != r.semana.temporada_id:
        invalidas.append(f"  ❌ Recv[{r.id}]: temp={r.temporada_id} != semana_temp={r.semana.temporada_id}")

if invalidas:
    for err in invalidas[:5]:
        print(err)
else:
    print("  ✅ CORRECTO: Todas las recepciones tienen IDs consistentes con su semana")

# 4. CONSTRAINTS ÚNICOS
print("\n" + "▶ SECCIÓN 4: VALIDACIÓN DE CONSTRAINTS ÚNICOS".center(100, "-"))

print("\n[CONSTRAINT] Máximo 1 semana abierta por (bodega, temporada):")
dup = CierreSemanal.objects.filter(
    fecha_hasta__isnull=True, is_active=True
).values('bodega_id', 'temporada_id').annotate(count=Count('id')).filter(count__gt=1)

if dup.exists():
    for d in dup:
        print(f"  ❌ VIOLACIÓN: Bodega={d['bodega_id']}, Temporada={d['temporada_id']} → {d['count']} abiertas")
else:
    print("  ✅ CORRECTO: No hay semanas abiertas duplicadas")

# 5. OVERPICKING
print("\n" + "▶ SECCIÓN 5: INTEGRIDAD DE BALANCE (Overpicking)".center(100, "-"))

print("\n[CHECK] Clasificación no excede Recepción:")
overpicks = []
for rec in Recepcion.objects.filter(is_active=True):
    total_clasif = ClasificacionEmpaque.objects.filter(
        recepcion=rec, is_active=True
    ).aggregate(t=Sum('cantidad_cajas'))['t'] or 0
    
    if total_clasif > rec.cajas_campo:
        diff = total_clasif - rec.cajas_campo
        overpicks.append(f"  ❌ Recv[{rec.id}]: Recibidas={rec.cajas_campo}, Clasificadas={total_clasif} (OVER+{diff})")

if overpicks:
    for o in overpicks[:5]:
        print(o)
    if len(overpicks) > 5:
        print(f"  ... y {len(overpicks) - 5} casos más")
else:
    print("  ✅ CORRECTO: No hay overpicking detectado")

# 6. TRAZABILIDAD (LOTES)
print("\n" + "▶ SECCIÓN 6: TRAZABILIDAD (LoteBodega)".center(100, "-"))

print("\n[LOTES] Propagación de Lote a Recepciones y Clasificaciones:")
for lote in LoteBodega.objects.filter(is_active=True)[:3]:
    recs = Recepcion.objects.filter(lote=lote, is_active=True).count()
    clasifs = ClasificacionEmpaque.objects.filter(lote=lote, is_active=True).count()
    print(f"  🏷️  Lote[ID={lote.id}] '{lote.codigo_lote}'")
    print(f"     ├─ Contexto: Bodega={lote.bodega_id}, Temp={lote.temporada_id}, Semana={lote.semana_id}")
    print(f"     ├─ Origen: {lote.origen_nombre}")
    print(f"     ├─ Recepciones: {recs}")
    print(f"     └─ Clasificaciones: {clasifs}")

# 7. STOCK REAL (CAMIONES)
print("\n" + "▶ SECCIÓN 7: STOCK REAL (CamionConsumoEmpaque)".center(100, "-"))

print("\n[CAMIONES] Consumo de Stock:")
for camion in CamionSalida.objects.filter(is_active=True)[:3]:
    consumos = CamionConsumoEmpaque.objects.filter(camion=camion, is_active=True)
    total = consumos.aggregate(t=Sum('cantidad'))['t'] or 0
    print(f"  🚛 Camión[ID={camion.id}] Placas:{camion.placas}, Estado:{camion.estado}")
    print(f"     ├─ Contexto: Bodega={camion.bodega_id}, Temp={camion.temporada_id}")
    print(f"     ├─ Cargas: {consumos.count()}")
    print(f"     └─ Total cajas: {total}")

# 8. ESTADOS DE SEMANA
print("\n" + "▶ SECCIÓN 8: MÁQUINA DE ESTADOS (Semanas)".center(100, "-"))

abiertas_total = CierreSemanal.objects.filter(fecha_hasta__isnull=True, is_active=True).count()
cerradas_total = CierreSemanal.objects.filter(fecha_hasta__isnull=False, is_active=True).count()
archivadas_total = CierreSemanal.objects.filter(is_active=False).count()

print("\n[ESTADOS] Distribución de Semanas:")
print(f"  🟢 ABIERTAS (fecha_hasta=NULL): {abiertas_total}")
print(f"  🔵 CERRADAS (fecha_hasta!=NULL): {cerradas_total}")
print(f"  📦 ARCHIVADAS (is_active=False): {archivadas_total}")

print("\n[ANÁLISIS] Semanas Abiertas - Detección de vencidas:")
hoy = timezone.localdate()
for sem in CierreSemanal.objects.filter(fecha_hasta__isnull=True, is_active=True):
    dias = (hoy - sem.fecha_desde).days
    estado = "🟢 VIGENTE" if dias <= 6 else "🔴 VENCIDA (día {})".format(dias)
    print(f"  Semana[ID={sem.id}]: Inicio={sem.fecha_desde}, Días={dias} → {estado}")

print("\n" + "="*100)
print("FIN DEL ANÁLISIS EXHAUSTIVO".center(100))
print("="*100)
