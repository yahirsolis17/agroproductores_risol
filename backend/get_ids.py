import os
import django
import sys

# Add the backend directory to sys.path so we can import settings
sys.path.append(os.getcwd())

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "agroproductores_risol.settings")
django.setup()

from gestion_bodega.models import Bodega, TemporadaBodega, CierreSemanal

print("--- DATA START ---")

print("Bodegas:")
for b in Bodega.objects.filter(is_active=True):
    print(f"Bodega: ID={b.id}, Nombre='{b.nombre}'")

print("\nTemporadas:")
for t in TemporadaBodega.objects.filter(is_active=True, finalizada=False):
    print(f"Temporada: ID={t.id}, BodegaID={t.bodega_id}, Año={t.año}")

print("\nSemanas (Last 5 active):")
for s in CierreSemanal.objects.filter(is_active=True).order_by('-fecha_desde')[:5]:
   print(f"Semana: ID={s.id}, BodegaID={s.bodega_id}, TemporadaID={s.temporada_id}, Fecha={s.fecha_desde}")

print("--- DATA END ---")
