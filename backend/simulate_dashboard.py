
import os
import sys
import django
import json
from datetime import date

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "agroproductores_risol.settings")
django.setup()

from django.test import RequestFactory
from rest_framework.request import Request
from gestion_bodega.models import Bodega, TemporadaBodega, Recepcion, ClasificacionEmpaque, CamionSalida, CierreSemanal
from gestion_bodega.views.tablero_views import TableroBodegaSummaryView, TableroBodegaQueuesView
from gestion_bodega.serializers import RecepcionSerializer

def pretty_print(title, data):
    print(f"\n--- {title} ---")
    print(json.dumps(data, indent=2, default=str))

def main():
    # 1. Context Resolution
    print(">>> Buscando contexto activo (Bodega/Temporada)...")
    temporada = TemporadaBodega.objects.filter(is_active=True).first()
    if not temporada:
        print("❌ No hay temporada activa.")
        return

    bodega = temporada.bodega
    print(f"✔ Contexto encontrado: Bodega ID={bodega.id}, Temporada ID={temporada.id}")

    # Check active week
    active_week = CierreSemanal.objects.filter(
        bodega=bodega, temporada=temporada, is_active=True, fecha_hasta__isnull=True
    ).first()
    
    week_str = f"ID={active_week.id} ({active_week.fecha_desde})" if active_week else "NONE"
    print(f"✔ Semana Activa: {week_str}")

    factory = RequestFactory()

    # Helper to simulate view call
    def call_view(view_cls, path, params):
        request = factory.get(path, params)
        # Force authentication (mock)
        request.user = type('User', (object,), {'is_authenticated': True, 'is_staff': True, 'has_perm': lambda x, y: True})()
        
        view = view_cls.as_view()
        response = view(request)
        if hasattr(response, 'data'):
            return response.data
        return {"error": "No data", "status": response.status_code}

    # 2. A) Evidence: 6 Requests

    # 2.1 Summary
    print("\n>>> 2.1 Summary Request")
    sum_data = call_view(TableroBodegaSummaryView, '/bodega/tablero/summary/', {
        'temporada': temporada.id, 'bodega': bodega.id
    })
    # Filter big output
    if 'data' in sum_data and 'kpis' in sum_data['data']:
        print(json.dumps({'context': sum_data['data'].get('context'), 'kpis': sum_data['data']['kpis']}, indent=2, default=str))
    else:
        print(sum_data)

    # 2.2 Queues: Recepciones
    print("\n>>> 2.2 Queues: Recepciones")
    rec_data = call_view(TableroBodegaQueuesView, '/bodega/tablero/queues/', {
        'temporada': temporada.id, 'bodega': bodega.id, 'type': 'recepciones'
    })
    if 'data' in rec_data:
        meta = rec_data['data'].get('meta')
        results = rec_data['data'].get('results', [])[:2] # First 2
        print(json.dumps({'meta': meta, 'results_sample': results}, indent=2, default=str))
        
        # Capture a reception ID for part B
        sample_recepcion_id = results[0]['id'] if results else None
    else:
        print(rec_data)
        sample_recepcion_id = None

    # 2.3 Queues: Inventarios
    print("\n>>> 2.3 Queues: Inventarios")
    inv_data = call_view(TableroBodegaQueuesView, '/bodega/tablero/queues/', {
        'temporada': temporada.id, 'bodega': bodega.id, 'type': 'inventarios'
    })
    if 'data' in inv_data:
        print(json.dumps({'meta': inv_data['data'].get('meta'), 'results_sample': inv_data['data'].get('results', [])[:2]}, indent=2, default=str))
    else:
        print(inv_data)

    # 2.4 Queues: Despachos ALL
    print("\n>>> 2.4 Queues: Despachos (ALL)")
    desp_all = call_view(TableroBodegaQueuesView, '/bodega/tablero/queues/', {
        'temporada': temporada.id, 'bodega': bodega.id, 'type': 'despachos'
    })
    if 'data' in desp_all:
        print(json.dumps({'meta': desp_all['data'].get('meta'), 'results_sample': desp_all['data'].get('results', [])[:2]}, indent=2, default=str))
    else:
        print(desp_all)

    # 2.5 Queues: Despachos BORRADOR
    print("\n>>> 2.5 Queues: Despachos (BORRADOR)")
    desp_draft = call_view(TableroBodegaQueuesView, '/bodega/tablero/queues/', {
        'temporada': temporada.id, 'bodega': bodega.id, 'type': 'despachos', 'estado': 'BORRADOR'
    })
    if 'data' in desp_draft:
        print(json.dumps({'meta': desp_draft['data'].get('meta'), 'results_sample': desp_draft['data'].get('results', [])[:2]}, indent=2, default=str))
    else:
        print(desp_draft)

    # 2.6 Camiones List (Direct)
    print("\n>>> 2.6 Camiones List (Direct Endpoint)")
    # Simulating ViewSet list
    camiones_qs = CamionSalida.objects.filter(
        bodega=bodega, temporada=temporada, estado='BORRADOR'
    )
    # Check if they have week assigned
    camiones_data = []
    for c in camiones_qs[:2]:
        camiones_data.append({
            "id": c.id, 
            "fecha_salida": c.fecha_salida, 
            "semana_id": c.semana_id,
            "estado": c.estado
        })
    print(f"Total Borradores Direct Query: {camiones_qs.count()}")
    print(json.dumps(camiones_data, indent=2, default=str))

    # 3. B) Evidence: EmpaqueDrawer Object
    print("\n>>> 3. B) Evidence: EmpaqueDrawer Object (Recepcion Detail)")
    if sample_recepcion_id:
        try:
            recepcion = Recepcion.objects.get(id=sample_recepcion_id)
            # Use serializer to see what frontend gets
            # Assuming there's a specific Retrieve serializer or just general one
            ser_data = RecepcionSerializer(recepcion).data
            # Focus on fields requested
            evidence_b = {
                "id": ser_data.get('id'),
                "kg": ser_data.get('kg'), # Check if exists
                "cajas_campo": ser_data.get('cajas_campo'),
                "cantidad_cajas": ser_data.get('cantidad_cajas'), # alias?
                "cajas_empaquetadas": getattr(recepcion, 'cajas_empaquetadas', 'N/A logic'), # model might not have it directly
                "meta_semana_id": ser_data.get('semana_id')
            }
            print(json.dumps(evidence_b, indent=2, default=str))
        except Exception as e:
            print(f"Error fetching recepcion: {e}")
    else:
        print("No recepciones found to sample.")


    # 4. D) Evidence: Backend Counts
    print("\n>>> 4. D) Evidence: Backend Counts (Context Check)")
    
    rec_count = Recepcion.objects.filter(bodega=bodega, temporada=temporada).count()
    rec_week_count = Recepcion.objects.filter(bodega=bodega, temporada=temporada, semana=active_week).count() if active_week else 0

    emp_count = ClasificacionEmpaque.objects.filter(bodega=bodega, temporada=temporada).count()
    emp_week_count = ClasificacionEmpaque.objects.filter(bodega=bodega, temporada=temporada, semana=active_week).count() if active_week else 0

    cam_count = CamionSalida.objects.filter(bodega=bodega, temporada=temporada).count()
    cam_draft_count = CamionSalida.objects.filter(bodega=bodega, temporada=temporada, estado='BORRADOR').count()
    cam_week_count = CamionSalida.objects.filter(bodega=bodega, temporada=temporada, semana=active_week).count() if active_week else 0
    cam_draft_no_week = CamionSalida.objects.filter(bodega=bodega, temporada=temporada, estado='BORRADOR', semana__isnull=True).count()

    print(f"Recepciones: Total={rec_count}, En Semana Activa={rec_week_count}")
    print(f"Empaques (Clasif): Total={emp_count}, En Semana Activa={emp_week_count}")
    print(f"Camiones: Total={cam_count}, Borradores={cam_draft_count}, En Semana Activa={cam_week_count}")
    print(f"Camiones Borradores SIN SEMANA: {cam_draft_no_week}")

if __name__ == "__main__":
    main()
