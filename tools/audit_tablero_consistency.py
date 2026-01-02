# tools/audit_tablero_consistency.py
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR / "backend"

# Asegura imports del proyecto Django
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "agroproductores_risol.settings")

import django
django.setup()
from django.conf import settings
if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('testserver')

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

def _extract_results(payload):
    # Soporta: NotificationHandler (data.meta/results), listas crudas, etc.
    if isinstance(payload, list):
        return {"results": payload, "meta": {"count": len(payload)}}

    data = payload.get("data", payload)
    if isinstance(data, list):
        return {"results": data, "meta": {"count": len(data)}}

    results = data.get("results", [])
    meta = data.get("meta", {}) or {"count": len(results)}
    return {"results": results, "meta": meta}

def call(client, path, params, label):
    print(f"Running [{label}]...")
    resp = client.get(path, params, format="json")
    try:
        payload = resp.json()
    except Exception:
        payload = {"_raw": resp.content.decode("utf-8", errors="ignore")}

    print(f"\n[{label}] {path} params={params}")
    print(f"Status: {resp.status_code}")

    if resp.status_code != 200:
        if isinstance(payload, dict) and "_raw" in payload:
            content = payload["_raw"]
            if "<html" in content.lower():
                 print(f"HTML Error Response (len={len(content)}). Likely 500/404 page.")
                 # Slice start of error if possible
                 print("Sample:", content[:200].replace("\n", " "))
            else:
                 print(payload)
        else:
            print(payload)
        return None

    out = _extract_results(payload)
    # resumen corto
    meta = out["meta"]
    results = out["results"]
    count = meta.get("count", meta.get("total", len(results)))
    print(f"Count: {count}")
    if isinstance(payload, dict) and "data" in payload and isinstance(payload["data"], dict) and "context" in payload["data"]:
        print(f"Context: {payload['data']['context']}")
    return payload

def main():
    # Ajusta estos defaults a tu escenario actual
    BODEGA = 16
    TEMPORADA = 8
    SEMANA = 9

    User = get_user_model()
    # Valid User Creation (Copied from debug_tablero_requests.py)
    user, created = User.objects.get_or_create(telefono='5555555555', defaults={'nombre': 'Debug', 'apellido': 'Admin', 'role': 'admin'})
    if created:
        user.set_password('admin123')
        user.save()
    
    # Force permissions equivalent to admin/superuser for audit purposes
    # user.is_superuser = True
    # user.save()
    
    if not user:
        raise RuntimeError("No hay usuarios en la BD para autenticar el audit.")

    client = APIClient()
    client.force_authenticate(user=user)

    # 1) Summary con semana
    call(client, "/bodega/tablero/summary/", {"bodega": BODEGA, "temporada": TEMPORADA, "semana_id": SEMANA}, "summary")

    # 2) Queues inventarios con semana
    call(client, "/bodega/tablero/queues/", {
        "queue": "inventarios",
        "bodega": BODEGA,
        "temporada": TEMPORADA,
        "semana_id": SEMANA,
        "order_by": "fecha:desc,id:desc",
    }, "queue_inventarios")

    # 3) Autocomplete SIN semana (para detectar bifurcación)
    call(client, "/bodega/empaques/disponibles/", {"bodega": BODEGA, "temporada": TEMPORADA}, "autocomplete_sin_semana")

    # 4) Autocomplete CON semana (debería existir y coincidir con inventarios)
    call(client, "/bodega/empaques/disponibles/", {"bodega": BODEGA, "temporada": TEMPORADA, "semana": SEMANA}, "autocomplete_con_semana")
    call(client, "/bodega/empaques/disponibles/", {"bodega": BODEGA, "temporada": TEMPORADA, "semana_id": SEMANA}, "autocomplete_con_semana_id")


    # 5) Despachos tabs
    call(client, "/bodega/tablero/queues/", {
        "queue": "despachos",
        "bodega": BODEGA,
        "temporada": TEMPORADA,
        "estado": "BORRADOR",
        "order_by": "fecha:desc,id:desc",
    }, "despachos_borrador")

    call(client, "/bodega/tablero/queues/", {
        "queue": "despachos",
        "bodega": BODEGA,
        "temporada": TEMPORADA,
        "estado": "CONFIRMADO",
        "order_by": "fecha:desc,id:desc",
    }, "despachos_confirmado")

if __name__ == "__main__":
    main()
