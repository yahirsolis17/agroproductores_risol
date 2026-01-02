import os, sys, json
sys.path.insert(0, r'C:\Users\Yahir\agroproductores_risol\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agroproductores_risol.settings')
import django
from django.test import Client
from django.contrib.auth import get_user_model

django.setup()
from django.conf import settings
if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('testserver')

User = get_user_model()

# Configuración de prueba
BODEGA_ID = 16
TEMPORADA_ID = 8 # Temporada activa según reporte
SEMANA_ID = 8    # Semana con recepciones según reporte

print(f"--- DEBUGGING TABLERO REQUESTS ---")
print(f"Contexto: Bodega={BODEGA_ID}, Temporada={TEMPORADA_ID}, Semana={SEMANA_ID}")

# Obtener o crear usuario para auth
user, created = User.objects.get_or_create(telefono='5555555555', defaults={'nombre': 'Debug', 'apellido': 'Admin', 'role': 'admin'})
if created:
    user.set_password('admin123')
    user.save()

client = Client()

# Obtener JWT Token (asumiendo SimpleJWT)
try:
    token_resp = client.post('/api/token/', {'telefono': '5555555555', 'password': 'admin123'})
    if token_resp.status_code == 200:
        access_token = token_resp.json()['access']
        auth_headers = {'HTTP_AUTHORIZATION': f'Bearer {access_token}'}
        print(f"Token JWT obtenido exitosamente.")
    else:
        print(f"Fallo auth JWT: {token_resp.content}")
        auth_headers = {}
except Exception as e:
    print(f"Error auth JWT: {e}")
    auth_headers = {}

# Si JWT falla, fallback a force_login pero probablemente fallará en endpoints protegidos solo por JWT
if not auth_headers:
    client.force_login(user)


results = {}

def debug_request(key, url, params, extra_headers=None):
    headers = auth_headers.copy()
    if extra_headers: headers.update(extra_headers)
    
    print(f"\n[{key}] Request: {url} {params}")
    resp = client.get(url, params, **headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        # Recortamos
        trimmed = {'url': url, 'params': params, 'keys': list(data.keys())}
        if 'data' in data:
            d = data['data']
            if isinstance(d, dict):
                trimmed['data_sample'] = {k: v for k, v in d.items() if k != 'results'}
                if 'results' in d: trimmed['results_sample'] = d['results'][:3]
            elif isinstance(d, list):
                trimmed['list_sample'] = d[:5]
        results[key] = trimmed
    else:
        results[key] = {'error': resp.status_code, 'content': str(resp.content)}

# 0. QUERY SEMANA 9 (Parece ser la activa real)
SEMANA_ACTIVA_ID = 9
debug_request('summary_s9', '/bodega/tablero/summary/', {'bodega': BODEGA_ID, 'temporada': TEMPORADA_ID, 'semana_id': SEMANA_ACTIVA_ID})
debug_request('recepciones_s9', '/bodega/tablero/queues/', {'queue': 'recepciones', 'bodega': BODEGA_ID, 'temporada': TEMPORADA_ID, 'semana_id': SEMANA_ACTIVA_ID})

# 1. SUMMARY S8
debug_request('summary_s8', '/bodega/tablero/summary/', {'bodega': BODEGA_ID, 'temporada': TEMPORADA_ID, 'semana_id': SEMANA_ID})

# 4. AUTOCOMPLETE
debug_request('autocomplete_stock', '/bodega/empaques/disponibles/', {'bodega': BODEGA_ID, 'temporada': TEMPORADA_ID})

# 2. QUEUE RECEPCIONES (Pendientes vs Total)
# El frontend suele pedir esto.
debug_request('queue_recepciones', '/bodega/tablero/queues/', {
    'queue': 'recepciones',
    'bodega': BODEGA_ID,
    'temporada': TEMPORADA_ID,
    'semana_id': SEMANA_ID
})

# 3. QUEUE INVENTARIOS (Stock Tabla) -> "solo_pendientes=true" es común en default tableros
debug_request('queue_inventarios_pendientes', '/bodega/tablero/queues/', {
    'queue': 'inventarios',
    'bodega': BODEGA_ID,
    'temporada': TEMPORADA_ID,
    'semana_id': SEMANA_ID,
    'solo_pendientes': 'true' 
})

# 3b. QUEUE INVENTARIOS (Stock Tabla) -> SIN filtro solo_pendientes
debug_request('queue_inventarios_all', '/bodega/tablero/queues/', {
    'queue': 'inventarios',
    'bodega': BODEGA_ID,
    'temporada': TEMPORADA_ID,
    'semana_id': SEMANA_ID
})

# 4. AUTOCOMPLETE (Stock Disponible para Camión)
# OJO: empaquesService.listDisponibles NO usa semana_id
debug_request('autocomplete_stock', '/bodega/empaques/disponibles/', {
    'bodega': BODEGA_ID,
    'temporada': TEMPORADA_ID
})

# 5. LOGÍSTICA BORRADORES
debug_request('queue_despachos_borrador', '/bodega/tablero/queues/', {
    'queue': 'despachos',
    'bodega': BODEGA_ID,
    'temporada': TEMPORADA_ID,
    'estado': 'BORRADOR'
})

# 6. LOGÍSTICA CONFIRMADOS
debug_request('queue_despachos_confirmado', '/bodega/tablero/queues/', {
    'queue': 'despachos',
    'bodega': BODEGA_ID,
    'temporada': TEMPORADA_ID,
    'estado': 'CONFIRMADO'
})

# 7. AUTOCOMPLETE FILTRADO (Unified Context Check)
debug_request('autocomplete_week_9', '/bodega/empaques/disponibles/', {
    'bodega': BODEGA_ID,
    'temporada': TEMPORADA_ID,
    'semana': SEMANA_ACTIVA_ID
})

# Guardar resultado
with open(r'C:\Users\Yahir\agroproductores_risol\debug_requests_output.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print("\nResultados guardados en debug_requests_output.json")
