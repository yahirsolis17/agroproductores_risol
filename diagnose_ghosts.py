
import os
import django
import sys
from django.db.models import Q

# Add project root to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Logic: verify_p5.py is in root, backend is in ./backend
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')
sys.path.append(BACKEND_DIR)

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "agroproductores_risol.settings")
django.setup()

from gestion_bodega.models import ClasificacionEmpaque, CamionConsumoEmpaque

def diagnose():
    print("--- DIAGNOSIS OF GHOST ITEMS ---")
    
    # Target: Items matching the screenshot roughly
    # Date: 2026-01-02
    # Cajas: 100 or 230 or 85
    # Huertero: Juan or Yahir
    
    targets = [100, 230, 85]
    
    candidates = ClasificacionEmpaque.objects.filter(
        fecha="2026-01-02",
        cantidad_cajas__in=targets
    ).select_related('lote', 'recepcion')
    
    print(f"Found {candidates.count()} candidates matching date/cajas criteria.")
    
    for c in candidates:
        print(f"\n[ID: {c.id}] Cajas: {c.cantidad_cajas} | Huertero: {c.recepcion.huertero_nombre if c.recepcion else 'None'}")
        print(f"  - Lote ID: {c.lote_id}")
        print(f"  - Recepcion ID: {c.recepcion_id}")
        print(f"  - Is Active: {c.is_active}")
        print(f"  - Calidad: {c.calidad}, Material: {c.material}")
        
        # Check Consumos
        consumos = CamionConsumoEmpaque.objects.filter(clasificacion_empaque=c)
        print(f"  - Consumos Found: {consumos.count()}")
        for cons in consumos:
            print(f"    -> Consumo ID: {cons.id} | Cantidad: {cons.cantidad} | Active: {cons.is_active}")
            print(f"       Camion ID: {cons.camion_id} | Estado: {cons.camion.estado} | Active: {cons.camion.is_active}")
            
    print("\n--- KPIS.PY SIMULATION ---")
    from gestion_bodega.utils.kpis import queue_inventarios_qs, build_queue_items
    
    # Simulate fetch for this season
    # Assuming season is active
    from gestion_bodega.models import TemporadaBodega
    t = TemporadaBodega.objects.filter(is_active=True).first()
    if t:
        qs = queue_inventarios_qs(temporada_id=t.id)
        # Filter QS to only these candidates if possible, or just fetch all and find them
        # Since queue groups by lote, and these might have None lote, let's see what happens
        
        raw_rows = list(qs)
        print(f"KPI Query returned {len(raw_rows)} rows.")
        
        # Find rows that might corresponds to our candidates
        # If Lote is None, they are grouped by ... wait, queue_inventarios_qs groups by what?
        # It groups by Lote.values(...). 
        # If Lote is None, does it return one row for None? 
        
        items = build_queue_items("inventarios", raw_rows)
        
        # Look for items with the specific characteristics
        found_in_kpi = False
        for item in items:
            # Check if this item matches our candidates
            # KPI item has 'kg' (cajas) and 'huertero'
            if item['kg'] in targets:
                print(f"\nMATCH IN KPI OUTPUT:")
                print(f"  - ID (LoteID): {item['id']}")
                print(f"  - Ref: {item['ref']}")
                print(f"  - Cajas: {item['kg']}")
                print(f"  - Clasificacion Label: {item.get('clasificacion_label')}")
                print(f"  - Meta.Despachado: {item['meta']['despachado']}")
                
if __name__ == "__main__":
    diagnose()
