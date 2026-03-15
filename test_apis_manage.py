import os
import sys
import json
import django
from django.test import Client
from django.contrib.auth import get_user_model

sys.path.append(r'C:\Users\Yahir\agroproductores_risol\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agroproductores_risol.settings')
django.setup()

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
        content = res.content.decode('utf-8', errors='ignore')
        if 'Exception' in content or 'Error' in content:
            # simple extract
            import re
            m = re.search(r'(Exception at /.*?<pre class="exception_value">(.*?)</pre>)', content, re.DOTALL)
            if m:
                print(m.group(2).strip())
            else:
                print(content[:500])
    else:
        print(f"✅ OK en {url}")

try:
    # Pruebas de Tablero de Bodega
    print("--- EMPEZANDO GETS ---")
    run_get(f"/api/bodega/tablero/summary/?bodega={bodega_id}&temporada={temp_id}")
    run_get(f"/api/bodega/tablero/alerts/?bodega={bodega_id}&temporada={temp_id}")
    run_get(f"/api/bodega/tablero/week/current/?bodega={bodega_id}&temporada={temp_id}")

    # Colas (Queues)
    run_get(f"/api/bodega/tablero/queues/?bodega={bodega_id}&temporada={temp_id}&queue=recepciones")
    run_get(f"/api/bodega/tablero/queues/?bodega={bodega_id}&temporada={temp_id}&queue=inventarios")
    run_get(f"/api/bodega/tablero/queues/?bodega={bodega_id}&temporada={temp_id}&queue=despachos")

    # Listados generales
    run_get(f"/api/bodega/recepciones/?bodega={bodega_id}&temporada={temp_id}")
    run_get(f"/api/bodega/empaques/disponibles/?bodega_id={bodega_id}&temporada_id={temp_id}")
    run_get(f"/api/bodega/camiones/?bodega={bodega_id}&temporada={temp_id}")
    run_get(f"/api/bodega/compras_madera/?bodega={bodega_id}&temporada={temp_id}")

    # Test POST: Start Week
    print("--- EMPEZANDO POSTS ---")
    from datetime import date
    from gestion_bodega.models import CierreSemanal
    
    abierta = CierreSemanal.objects.filter(bodega_id=bodega_id, temporada_id=temp_id, fecha_hasta__isnull=True).first()
    if abierta:
        abierta.fecha_hasta = date.today()
        abierta.save()
        
    post_res = client.post("/api/bodega/tablero/week/start/", {"bodega": bodega_id, "temporada": temp_id, "fecha_desde": str(date.today())}, content_type="application/json")
    if post_res.status_code >= 400:
        print(f"\n❌ ERROR {post_res.status_code} POST start week")
        print(post_res.content.decode('utf-8', errors='ignore')[:500])
    else:
        print(f"✅ POST Start Week OK")

except Exception as e:
    import traceback
    traceback.print_exc()

import sys; sys.exit(0)
