import os, sys
sys.path.append(r'C:\Users\Yahir\agroproductores_risol\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agroproductores_risol.settings')
import django
django.setup()

from gestion_bodega.models import *

bodega = Bodega.objects.first()
temporada = TemporadaBodega.objects.filter(is_active=True).first()

print(f"🏢 Bodega: {bodega.nombre} (ID: {bodega.id})")
print(f"📅 Temporada: {temporada.año} (ID: {temporada.id})")

print(f"\n📊 Datos existentes:")
print(f"  Recepciones activas: {Recepcion.objects.filter(temporada=temporada, is_active=True).count()}")
print(f"  Lotes activos: {LoteBodega.objects.filter(temporada=temporada, is_active=True).count()}")
print(f"  ClasificacionEmpaque activas: {ClasificacionEmpaque.objects.filter(temporada=temporada, is_active=True).count()}")
print(f"  Camiones activos: {CamionSalida.objects.filter(temporada=temporada, is_active=True).count()}")

# Mostrar camiones por estado
print(f"\n🚛 Camiones por estado:")
for estado in ['BORRADOR', 'CONFIRMADO', 'DESPACHADO']:
    count = CamionSalida.objects.filter(temporada=temporada, is_active=True, estado=estado).count()
    print(f"  {estado}: {count}")

print(f"\n🔍 Para testing:")
print(f"  bodega={bodega.id}&temporada={temporada.id}")
