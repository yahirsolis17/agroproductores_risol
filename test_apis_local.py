import os
import sys
import django

sys.path.append(r'C:\Users\Yahir\agroproductores_risol\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agroproductores_risol.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
import json

print("Iniciando pruebas de APIs REST E2E...")
client = Client()

User = get_user_model()
user = User.objects.filter(is_superuser=True).first()
if not user:
    user = User.objects.create_superuser('testadmin', 'admin@test.com', 'adminpass')
client.force_login(user)

bodega_id = 1
temp_id = 1

def run_get(url):
    res = client.get(url)
    if res.status_code >= 400:
        print(f"\n❌ ERROR {res.status_code} en {url}")
        try:
            print(json.dumps(res.json(), indent=2))
        except:
            print(res.content)
    else:
        print(f"✅ OK en {url}")

try:
    # Pruebas de Tablero de Bodega
    run_get(f"/api/bodega/tablero/summary/?bodega={bodega_id}&temporada={temp_id}")
    run_get(f"/api/bodega/tablero/alerts/?bodega={bodega_id}&temporada={temp_id}")
    run_get(f"/api/bodega/tablero/week/current/?bodega={bodega_id}&temporada={temp_id}")

    # Colas (Queues)
    run_get(f"/api/bodega/tablero/queues/?bodega={bodega_id}&temporada={temp_id}&type=recepciones")
    run_get(f"/api/bodega/tablero/queues/?bodega={bodega_id}&temporada={temp_id}&type=inventarios")
    run_get(f"/api/bodega/tablero/queues/?bodega={bodega_id}&temporada={temp_id}&type=despachos")

    # Listados generales
    run_get(f"/api/bodega/recepciones/?bodega={bodega_id}&temporada={temp_id}")
    run_get(f"/api/bodega/empaques/disponibles/?bodega_id={bodega_id}&temporada_id={temp_id}")
    run_get(f"/api/bodega/camiones/?bodega={bodega_id}&temporada={temp_id}")
    run_get(f"/api/bodega/compras_madera/?bodega={bodega_id}&temporada={temp_id}")

    print("\nEndpoints GET verificados.")

    # Test POST: Start Week (para ver si explota algo mas)
    from datetime import date
    from gestion_bodega.models import CierreSemanal
    
    # Cerrar si hay
    abierta = CierreSemanal.objects.filter(bodega_id=bodega_id, temporada_id=temp_id, fecha_hasta__isnull=True).first()
    if abierta:
        abierta.fecha_hasta = date.today()
        abierta.save()
        
    post_res = client.post("/api/bodega/tablero/week/start/", {"bodega": bodega_id, "temporada": temp_id, "fecha_desde": str(date.today())}, content_type="application/json")
    if post_res.status_code >= 400:
        print(f"\n❌ ERROR {post_res.status_code} POST start week")
        print(post_res.json())
    else:
        print(f"✅ POST Start Week OK")

except Exception as e:
    import traceback
    traceback.print_exc()

import sys; sys.exit(0)
