import os
import sys
import django
import json
import logging

# Add backend directory to sys.path
sys.path.append(r"c:\Users\Yahir\agroproductores_risol\backend")

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agroproductores_risol.settings')
django.setup()

# Configure logging to capture logger.exception output
logging.basicConfig(level=logging.ERROR, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', stream=sys.stdout)
root_logger = logging.getLogger('gestion_bodega')
root_logger.setLevel(logging.ERROR)
handler = logging.StreamHandler(sys.stdout)
if not root_logger.handlers:
    root_logger.addHandler(handler)

from django.test import Client
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

client = Client(HTTP_HOST='localhost', raise_request_exception=True)

User = get_user_model()
user = User.objects.filter(is_superuser=True).first()
if not user:
    user = User.objects.create_superuser('testadmin', 'admin@test.com', 'adminpass')
refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)

bodega_id = 1
temp_id = 1

def run_get(url):
    res = client.get(url, HTTP_AUTHORIZATION=f"Bearer {access_token}")
    if res.status_code >= 400:
        print(f"\n❌ ERROR {res.status_code} en GET {url}")
    else:
        print(f"✅ GET OK en {url}")

try:
    print("--- EMPEZANDO GETS ---")
    run_get(f"/bodega/tablero/summary/?bodega={bodega_id}&temporada={temp_id}")
    run_get(f"/bodega/tablero/alerts/?bodega={bodega_id}&temporada={temp_id}")
    run_get(f"/bodega/tablero/week/current/?bodega={bodega_id}&temporada={temp_id}")

    run_get(f"/bodega/tablero/queues/?bodega={bodega_id}&temporada={temp_id}&queue=recepciones")
    run_get(f"/bodega/tablero/queues/?bodega={bodega_id}&temporada={temp_id}&queue=inventarios")
    run_get(f"/bodega/tablero/queues/?bodega={bodega_id}&temporada={temp_id}&queue=despachos")

    run_get(f"/bodega/recepciones/?bodega={bodega_id}&temporada={temp_id}")
    run_get(f"/bodega/empaques/disponibles/?bodega_id={bodega_id}&temporada_id={temp_id}")
    run_get(f"/bodega/camiones/?bodega={bodega_id}&temporada={temp_id}")
    run_get(f"/bodega/compras-madera/?bodega={bodega_id}&temporada={temp_id}")

    print("--- EMPEZANDO POSTS ---")
    from datetime import date
    from gestion_bodega.models import CierreSemanal
    
    abierta = CierreSemanal.objects.filter(bodega_id=bodega_id, temporada_id=temp_id, fecha_hasta__isnull=True).first()
    if abierta:
        abierta.fecha_hasta = date.today()
        abierta.save()
        
    post_res = client.post("/bodega/tablero/week/start/", {"bodega": bodega_id, "temporada": temp_id, "fecha_desde": str(date.today())}, content_type="application/json", HTTP_AUTHORIZATION=f"Bearer {access_token}")
    if post_res.status_code >= 400:
        print(f"\n❌ ERROR {post_res.status_code} POST start week")
        with open("output_error.json", "w", encoding="utf-8") as f:
            f.write(json.dumps(post_res.json(), indent=2))
    else:
        print(f"✅ POST Start Week OK")

except Exception as e:
    import traceback
    traceback.print_exc()
