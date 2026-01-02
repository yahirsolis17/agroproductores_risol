import os, sys
sys.path.insert(0, r'C:\Users\Yahir\agroproductores_risol\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agroproductores_risol.settings')
import django
django.setup()

from gestion_bodega.models import *
from django.db.models import Count, Sum

print("="*80)
print("ANÁLISIS FLUJO GESTIÓN DE BODEGA - PARTE 1: CONTEOS Y JERARQUÍA")
print("="*80)

# Conteos
print("\n### CONTEOS TOTALES ###\n")
print(f"Bodegas:              {Bodega.objects.count()}")
print(f"TemporadaBodega:      {TemporadaBodega.objects.count()}")
print(f"CierreSemanal:        {CierreSemanal.objects.count()}")
print(f"LoteBodega:           {LoteBodega.objects.count()}")
print(f"Recepcion:            {Recepcion.objects.count()}")
print(f"ClasificacionEmpaque: {ClasificacionEmpaque.objects.count()}")
print(f"CamionSalida:         {CamionSalida.objects.count()}")
print(f"CamionConsumoEmpaque: {CamionConsumoEmpaque.objects.count()}")

# Jerarquía Bodega → Temporada
print("\n### JERARQUÍA NIVEL 1: Bodega → Temporada ###\n")
for bodega in Bodega.objects.filter(is_active=True)[:3]:
    temps = TemporadaBodega.objects.filter(bodega=bodega, is_active=True).count()
    print(f"Bodega[{bodega.id}] '{bodega.nombre}' → {temps} temporadas activas")

# Temporada → Semana
print("\n### JERARQUÍA NIVEL 2: Temporada → Semana ###\n")
for temp in TemporadaBodega.objects.filter(is_active=True)[:3]:
    semanas = CierreSemanal.objects.filter(temporada=temp, is_active=True)
    abiertas = semanas.filter(fecha_hasta__isnull=True).count()
    cerradas = semanas.filter(fecha_hasta__isnull=False).count()
    print(f"Temporada[{temp.id}] Bodega:{temp.bodega_id}")
    print(f"  ├─ Total semanas: {semanas.count()}")
    print(f"  ├─ Abiertas: {abiertas}")
    print(f"  └─ Cerradas: {cerradas}")

# Semana → Recepciones
print("\n### JERARQUÍA NIVEL 3: Semana → Recepciones ###\n")
for semana in CierreSemanal.objects.filter(is_active=True)[:3]:
    recs = Recepcion.objects.filter(semana=semana, is_active=True)
    total_cajas = recs.aggregate(t=Sum('cantidad_cajas'))['t'] or 0
    print(f"Semana[{semana.id}] Bodega:{semana.bodega_id}, Temp:{semana.temporada_id}")
    print(f"  ├─ Fecha desde: {semana.fecha_desde}")
    print(f"  ├─ Recepciones: {recs.count()}")
    print(f"  └─ Total cajas recibidas: {total_cajas}")

# Recepción → Clasificaciones
print("\n### JERARQUÍA NIVEL 4: Recepción → Clasificaciones ###\n")
for rec in Recepcion.objects.filter(is_active=True)[:3]:
    clasifs = ClasificacionEmpaque.objects.filter(recepcion=rec, is_active=True)
    total_clase = clasifs.aggregate(t=Sum('cantidad_cajas'))['t'] or 0
    print(f"Recepción[{rec.id}]")
    print(f"  ├─ IDs: Bodega:{rec.bodega_id}, Temp:{rec.temporada_id}, Semana:{rec.semana_id}")
    if rec.lote_id:
        print(f"  ├─ Lote: {rec.lote_id}")
    print(f"  ├─ Cajas recibidas: {rec.cantidad_cajas}")
    print(f"  ├─ Clasificaciones hijas: {clasifs.count()}")
    print(f"  └─ Total clasificado: {total_clase}")
