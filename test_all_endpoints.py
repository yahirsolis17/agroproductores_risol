#!/usr/bin/env python
"""
Test all API endpoints to verify they return 200 OK and have correct structure
"""
import os
import sys
import json

sys.path.append(r'C:\Users\Yahir\agroproductores_risol\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agroproductores_risol.settings')

import django
django.setup()

from django.test import Client
from gestion_usuarios.models import Users

def test_all_endpoints():
    """Test all tablero endpoints"""
    client = Client(HTTP_HOST='127.0.0.1')
    
    # Login
    try:
        user = Users.objects.get(telefono="1234567890")
        client.force_login(user)
    except:
        print("❌ No user found")
        return
    
    # Base params (use existing IDs)
    base = {"temporada": 8, "bodega": 16}
    
    print("=" * 60)
    print("PRUEBAS DE ENDPOINTS - TABLERO BODEGA")
    print("=" * 60)
    
    # 1. Test Summary
    print("\n1️⃣ GET /bodega/tablero/summary/")
    resp = client.get("/bodega/tablero/summary/", base)
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"   ✅ KPIs: {list(data.get('data', {}).get('kpis', {}).keys())}")
    else:
        print(f"   ❌ Error: {resp.content[:200]}")
    
    # 2. Test Queues - Recepciones
    print("\n2️⃣ GET /bodega/tablero/queues/?queue=recepciones")
    params = {**base, "queue": "recepciones", "order_by": "fecha:desc,id:desc"}
    resp = client.get("/bodega/tablero/queues", params)
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        results = data.get('data', {}).get('results', [])
        print(f"   ✅ Items: {len(results)}")
        if results:
            print(f"   Sample: {results[0].get('ref')} - {results[0].get('kg')} cajas")
    else:
        print(f"   ❌ Error: {resp.content[:200]}")
    
    # 3. Test Queues - Inventarios
    print("\n3️⃣ GET /bodega/tablero/queues/?queue=inventarios")
    params = {**base, "queue": "inventarios", "order_by": "fecha:desc,id:desc"}
    resp = client.get("/bodega/tablero/queues/", params)
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        results = data.get('data', {}).get('results', [])
        print(f"   ✅ Items: {len(results)}")
        if results:
            item = results[0]
            print(f"   Sample ref: {item.get('ref')}")
            print(f"   Sample desglose: {item.get('meta', {}).get('desglose', [])}")
            print(f"   Sample total cajas: {item.get('kg')}")
    else:
        print(f"   ❌ Error: {resp.content[:200]}")
    
    # 4. Test Queues - Despachos (Todos)
    print("\n4️⃣ GET /bodega/tablero/queues/?queue=despachos")
    params = {**base, "queue": "despachos", "order_by": "fecha:desc,id:desc"}
    resp = client.get("/bodega/tablero/queues/", params)
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        results = data.get('data', {}).get('results', [])
        print(f"   ✅ Items: {len(results)}")
    else:
        print(f"   ❌ Error: {resp.content[:200]}")
    
    # 5. Test Queues - Despachos (Borradores)
    print("\n5️⃣ GET /bodega/tablero/queues/?queue=despachos&estado=BORRADOR")
    params = {**base, "queue": "despachos", "estado": "BORRADOR"}
    resp = client.get("/bodega/tablero/queues/", params)
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        results = data.get('data', {}).get('results', [])
        print(f"   ✅ Items (Borradores): {len(results)}")
        # Verify all are BORRADOR
        estados = [r.get('estado') for r in results]
        if all(e == 'BORRADOR' for e in estados):
            print(f"   ✅ Filtro correcto: todos son BORRADOR")
        elif estados:
            print(f"   ⚠️  Filtro incorrecto: estados={set(estados)}")
    else:
        print(f"   ❌ Error: {resp.content[:200]}")
    
    # 6. Test Queues - Despachos (Confirmados)
    print("\n6️⃣ GET /bodega/tablero/queues/?queue=despachos&estado=CONFIRMADO")
    params = {**base, "queue": "despachos", "estado": "CONFIRMADO"}
    resp = client.get("/bodega/tablero/queues/", params)
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        results = data.get('data', {}).get('results', [])
        print(f"   ✅ Items (Confirmados): {len(results)}")
        # Verify all are CONFIRMADO
        estados = [r.get('estado') for r in results]
        if all(e == 'CONFIRMADO' for e in estados):
            print(f"   ✅ Filtro correcto: todos son CONFIRMADO")
        elif estados:
            print(f"   ⚠️  Filtro incorrecto: estados={set(estados)}")
    else:
        print(f"   ❌ Error: {resp.content[:200]}")
    
    print("\n" + "=" * 60)
    print("RESUMEN DE PRUEBAS")
    print("=" * 60)
    print("✅ Si todos los endpoints devuelven 200 OK → Backend estable")
    print("⚠️  Si faltan datos (0 items) → Crear test  data en UI")
    print("❌ Si hay 500/400 → Revisar logs del servidor")

if __name__ == "__main__":
    test_all_endpoints()
