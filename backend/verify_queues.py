
import os
import sys
import django
import json
from datetime import date

# Setup Django
sys.path.append(r'C:\Users\Yahir\agroproductores_risol\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agroproductores_risol.settings')
django.setup()

from gestion_bodega.utils.kpis import queue_inventarios_qs, queue_despachos_qs, build_queue_items

def json_serial(obj):
    if isinstance(obj, (date,)):
        return obj.isoformat()
    raise TypeError (f"Type {type(obj)} not serializable")

print("--- VERIFICACIÓN A: EMPAQUE (INVENTARIOS) ---")
# Obtener datos reales de inventarios
# Asumimos temporada 1 (o la activa)
qs_inv = queue_inventarios_qs(temporada_id=1) 
items_inv = build_queue_items("inventarios", qs_inv)

if items_inv:
    print(json.dumps(items_inv[0], default=json_serial, indent=2))
else:
    print("No hay items de inventario para mostrar.")

print("\n--- VERIFICACIÓN C: LOGISTICA (DESPACHOS) ---")
# 1. BORRADOR
qs_borrador = queue_despachos_qs(temporada_id=1, estado="BORRADOR")
items_borrador = build_queue_items("despachos", qs_borrador)
print(f"Items Borrador: {len(items_borrador)}")
if items_borrador:
    print(json.dumps(items_borrador[0], default=json_serial, indent=2))

# 2. CONFIRMADO
qs_confirmado = queue_despachos_qs(temporada_id=1, estado="CONFIRMADO")
items_confirmado = build_queue_items("despachos", qs_confirmado)
print(f"Items Confirmado: {len(items_confirmado)}")
