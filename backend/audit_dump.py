import os
import django
import json
import sys
import traceback

sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "agroproductores_risol.settings")
django.setup()

from django.test import Client
from gestion_bodega.models import Recepcion
from gestion_bodega.serializers import RecepcionSerializer

client = Client()
from django.conf import settings
settings.ALLOWED_HOSTS = list(settings.ALLOWED_HOSTS) + ['testserver']


BODEGA_ID = 16
TEMPORADA_ID = 7
SEMANA_ID = 8

print("--- RESPONSE START: SUMMARY ---")
try:
    url = f"/bodega/tablero/summary/?bodega={BODEGA_ID}&temporada={TEMPORADA_ID}&week_id={SEMANA_ID}"
    # Use week_id because that's what the user URL example had, but backend might expect semana_id or translate it.
    # The user said: "Param naming: tu URL trae week_id=8. Confirma que backend está leyendo week_id y lo traduce"
    # I will try both or rely on the view logic I haven't seen yet (tablero_views.py).
    # But wait, looking at `tableroBodegaService.ts`: `toQueryParams` converts `semanaId` (from FE) to `semana_id`.
    # Frontend passes `week_id` in URL, hook reads it, puts it in `selectedWeekId` (state), calls service with `semanaId`.
    # Service `toQueryParams` sends `semana_id`.
    # So I should PROBABLY send `semana_id` here if I want to simulate the service call, OR send `week_id` if the backend supports it.
    # I'll check `tableroBodegaService.ts`:
    # `if (semanaId != null) params.semana_id = semanaId;`
    # So the backend likely expects `semana_id`.
    
    # Actually, let's just use `semana_id` to be safe, as that's what `toQueryParams` sends.
    url = f"/bodega/tablero/summary/?bodega={BODEGA_ID}&temporada={TEMPORADA_ID}&semana_id={SEMANA_ID}"
    
    resp = client.get(url)
    print(f"Status: {resp.status_code}")
    try:
        print(json.dumps(resp.json(), indent=2))
    except:
        print(resp.content.decode())
except Exception as e:
    print(f"Error fetching summary: {e}")
print("--- RESPONSE END: SUMMARY ---")

print("\n--- RESPONSE START: QUEUES INVENTARIOS ---")
try:
    url = f"/bodega/tablero/queues/?bodega={BODEGA_ID}&temporada={TEMPORADA_ID}&semana_id={SEMANA_ID}&type=inventarios"
    resp = client.get(url)
    print(f"Status: {resp.status_code}")
    try:
        print(json.dumps(resp.json(), indent=2))
    except:
        print(resp.content.decode())
except Exception as e:
    print(f"Error fetching queues: {e}")
print("--- RESPONSE END: QUEUES INVENTARIOS ---")

print("\n--- TEST SERIALIZER LOTE ---")
try:
    # Try to serialize a Recepcion to see if it crashes
    rec = Recepcion.objects.filter(bodega_id=BODEGA_ID, temporada_id=TEMPORADA_ID).first()
    if rec:
        print(f"Testing serialization for Recepcion ID: {rec.id}")
        ser = RecepcionSerializer(rec)
        data = ser.data # This triggers the field access
        print("Serialization Successful. Data keys:", data.keys())
        if 'lote_codigo' in data:
            print(f"lote_codigo value: {data['lote_codigo']}")
    else:
        print("No Recepcion found to test serialization.")
except Exception:
    traceback.print_exc()
print("--- TEST SERIALIZER END ---")
