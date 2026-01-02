
import os
import django
import sys
from django.db.models import Count

# Add project root to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Logic: verify_p5.py is in root, backend is in ./backend
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')
sys.path.append(BACKEND_DIR)

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "agroproductores_risol.settings")
django.setup()

from gestion_bodega.models import ClasificacionEmpaque, CamionConsumoEmpaque

def check_data_integrity():
    print("--- CHECKING NULL LOTE_ID ---")
    
    # 1. Count ClasificacionEmpaque with null lote
    null_lotes = ClasificacionEmpaque.objects.filter(lote__isnull=True, is_active=True)
    count = null_lotes.count()
    print(f"Active ClasificacionEmpaque with lote=None: {count}")
    
    if count > 0:
        print("SAMPLE (first 5):")
        for c in null_lotes[:5]:
            print(f"ID: {c.id}, Recepcion: {c.recepcion_id}, Recepcion.Lote: {c.recepcion.lote_id if c.recepcion else 'NoRecepcion'}")

    # 2. Check if any of these are "Consumed" by a truck
    consumed_nulls = CamionConsumoEmpaque.objects.filter(
        clasificacion_empaque__lote__isnull=True,
        is_active=True
    ).count()
    
    print(f"Active Consumptions linked to Null-Lote Classifications: {consumed_nulls}")

    # 3. Check Recepcion vs Clasificacion Sync
    # Clasificaciones where lote is None but Recepcion HAS a lote
    unsynced = ClasificacionEmpaque.objects.filter(
        lote__isnull=True,
        recepcion__lote__isnull=False,
        is_active=True
    ).count()
    print(f"Clasificaciones missing Lote (but parent Has Lote): {unsynced}")

if __name__ == "__main__":
    check_data_integrity()
