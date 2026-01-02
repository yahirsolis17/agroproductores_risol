
import os
import django
import sys
import json
from django.db.models import Max

# Add project root to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')
sys.path.append(BACKEND_DIR)

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "agroproductores_risol.settings")
django.setup()

from gestion_bodega.utils.kpis import queue_inventarios_qs, build_queue_items
from gestion_bodega.models import TemporadaBodega, ClasificacionEmpaque

def debug_live():
    print("--- LIVE KPI DEBUG ---")
    
    # 1. Get active season
    t = TemporadaBodega.objects.filter(is_active=True).first()
    if not t:
        print("No active season found.")
        return
    
    print(f"Season: {t.id} - {str(t)}")

    # 2. Emulate the View Logic
    # The view calls queue_inventarios_qs(temporada_id=...)
    print("Executing queue_inventarios_qs...")
    qs = queue_inventarios_qs(temporada_id=t.id)
    
    # Force list to evaluate QuerySet
    raw_rows = list(qs)
    print(f"Total Rows in Inventory Queue: {len(raw_rows)}")
    
    # 3. Find our target rows (Lote ID 22 or Cajas 100/230/85)
    # Based on previous diagnosis, Lote ID 22 had 100 boxes.
    targets_lote_ids = [22] 
    # Also look for any row with matching box counts if Lote ID 22 isn't found
    target_cajas = [100.0, 230.0, 85.0]
    
    target_rows = []
    for r in raw_rows:
        lid = r.get('lote__id')
        cajas = float(r.get('total_cajas') or 0)
        
        match_id = lid in targets_lote_ids
        match_cajas = False
        for tc in target_cajas:
            if abs(cajas - tc) < 0.1:
                match_cajas = True
                break
        
        if match_id or match_cajas:
            target_rows.append(r)

    print(f"Found {len(target_rows)} target rows matching criteria.")
    
    # 4. Build Items using the REAL logic
    if target_rows:
        print("\nBuilding Items for Targets...")
        built_items = build_queue_items("inventarios", target_rows)
        
        for item in built_items:
            print("\n---------------------------------------------------")
            print(f"ID (Ref): {item['id']} ({item['ref']})")
            print(f"Fecha: {item['fecha']}")
            print(f"Cajas (kg): {item['kg']}")
            print(f"Huertero: {item['huertero']}")
            print(f"Clasificacion Label: '{item.get('clasificacion_label')}'")
            print(f"Meta Despachado: {item['meta'].get('despachado')}")
            
            # Print Internal Details for debugging
            print(f" -> Lote ID: {item.get('lote_id')}")
            print(f" -> Recepcion ID: {item.get('recepcion_id')}")
            print(" -> Desglose Raw:", item['meta'].get('desglose'))
    else:
        print("No targets found in the standard queue query. This suggests the items are being filtered OUT by the base QuerySet options (e.g. date range, active status).")
        # Try to inspect why they might be missing
        # Check ClasificacionEmpaque for Lote 22
        ce = ClasificacionEmpaque.objects.filter(lote_id=22).first()
        if ce:
            print(f"\nDiagnostic for Lote 22 (ClasificacionEmpaque ID {ce.id}):")
            print(f"Is Active: {ce.is_active}")
            print(f"Temporada ID: {ce.temporada_id} (vs Active {t.id})")
            print(f"Calidad: {ce.calidad}")
            # Check InventorySnapshot logic? It uses get_stock_snapshot
            # Maybe 'is_stock' logic? 

if __name__ == "__main__":
    debug_live()
