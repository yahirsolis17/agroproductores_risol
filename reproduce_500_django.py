
import os
import sys
import django
from django.test import Client

# Setup Django
sys.path.append(r'C:\Users\Yahir\agroproductores_risol\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agroproductores_risol.settings')
django.setup()

from gestion_usuarios.models import Users

def reproduce_with_django_client():
    client = Client(HTTP_HOST='127.0.0.1')
    
    # Get a user (Audit user created earlier)
    try:
        user = Users.objects.get(telefono="1234567890")
        client.force_login(user)
    except Exception as e:
        print(f"Could not login: {e}")
        return
    
    url = "/bodega/tablero/queues/"

    try:
        from gestion_bodega.models import Bodega
        bodega_id = Bodega.objects.first().id
    except:
        bodega_id = 1

    params = {
        "queue": "inventarios",
        "temporada": 1,
        "bodega": bodega_id,
        "order_by": "fecha:desc,id:desc"
    }

    print(f"Making request to {url} with params {params}")
    try:
        response = client.get(url, params)
        print(f"Response Status Code: {response.status_code}")
        if response.status_code == 500:
             print("FAIL: Still getting 500 error.")
             with open("traceback.html", "wb") as f:
                 f.write(response.content)
             print("Saved traceback.html")
        elif response.status_code == 200:
             print("SUCCESS: Fix verified! Got 200 OK.")
             print(response.content.decode('utf-8')[:500]) # Print first 500 chars
        else:
             print(f"FAIL: Unexpected status {response.status_code}")
             print(response.content.decode('utf-8'))
    except Exception as e:
        print(f"Exception during request: {e}")

if __name__ == "__main__":
    reproduce_with_django_client()

