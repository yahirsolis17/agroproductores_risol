import os
import sys
import django
import json

sys.path.append(r'C:\Users\Yahir\agroproductores_risol\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agroproductores_risol.settings')
django.setup()

from django.test import Client
from gestion_usuarios.models import Users
from gestion_bodega.models import Bodega

def capture_inventarios_response():
    """Captura el response JSON del endpoint inventarios"""
    client = Client(HTTP_HOST='127.0.0.1')
    
    try:
        user = Users.objects.get(telefono="1234567890")
        client.force_login(user)
    except:
        print("Could not login")
        return
    
    try:
        bodega_id = Bodega.objects.first().id
    except:
        bodega_id = 1
    
    url = "/bodega/tablero/queues/"
    params = {
        "queue": "inventarios",
        "temporada": 1,
        "bodega": bodega_id,
        "order_by": "fecha:desc,id:desc"
    }
    
    response = client.get(url, params)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        # Pretty print solo los primeros 2 results
        results = data.get('data', {}).get('results', [])
        print("\n=== RESPONSE SHAPE (primeros 2 items) ===")
        print(json.dumps(results[:2], indent=2, ensure_ascii=False))
        print(f"\n=== Total items: {len(results)} ===")
    else:
        print(f"Error: {response.content.decode('utf-8')}")

if __name__ == "__main__":
    capture_inventarios_response()
