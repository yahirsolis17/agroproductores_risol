
import os
import sys
import django
import json
from django.test import Client

sys.path.append(r'C:\Users\Yahir\agroproductores_risol\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agroproductores_risol.settings')
django.setup()

from gestion_usuarios.models import Users

def debug():
    client = Client(HTTP_HOST='127.0.0.1')
    try:
        user = Users.objects.get(telefono="1234567890")
        client.force_login(user)
    except:
        pass

    url = "/bodega/tablero/queues/"
    params = {
        "queue": "inventarios",
        "temporada_id": 1,
        "order_by": "fecha:desc,id:desc"
    }

    try:
        response = client.get(url, params)
        print(f"STATUS: {response.status_code}")
        if response.status_code == 400:
            try:
                data = response.json()
                print("DETAIL:", data.get('data'))
            except:
                print("RAW BODY:", response.content.decode('utf-8'))
        elif response.status_code == 200:
             print("SUCCESS 200")
        else:
             print("OTHER STATUS")
             print(response.content.decode('utf-8'))

    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    debug()
