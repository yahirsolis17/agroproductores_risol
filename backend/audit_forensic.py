import os
import django
import json
import sys
import traceback

sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "agroproductores_risol.settings")
django.setup()

from django.test import Client, RequestFactory
from django.conf import settings
# Verify/Add ALLOWED_HOSTS
if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS = list(settings.ALLOWED_HOSTS) + ['testserver']

from gestion_bodega.models import Recepcion, CamionSalida
from gestion_bodega.serializers import RecepcionSerializer

from django.contrib.auth import get_user_model
User = get_user_model()
from rest_framework_simplejwt.tokens import RefreshToken

client = Client()
u = User.objects.filter(is_active=True).first()
TOKEN = ""
if u:
    print(f"Logged in as: {u}")
    refresh = RefreshToken.for_user(u)
    TOKEN = str(refresh.access_token)
else:
    print("WARNING: No user found!")

# VALID PARAMETERS (from previous audit/user input)
# User URL: ?temporada=7&bodega=16&week_id=8
BODEGA_ID = 16
TEMPORADA_ID = 7
SEMANA_ID = 8 # equivalent to week_id=8

def print_section(name, content):
    print(f"\n--- {name} START ---")
    print(content)
    print(f"--- {name} END ---")

def fetch_json(url):
    try:
        # Pass JWT Token in header
        resp = client.get(url, HTTP_AUTHORIZATION=f'Bearer {TOKEN}')
        try:
            data = resp.json()
            return f"Status: {resp.status_code}\n{json.dumps(data, indent=2)}"
        except:
            return f"Status: {resp.status_code}\nBody: {resp.content.decode()[:1000]}..."
    except Exception as e:
        return f"Error: {e}"

# 1. Summary (Checking if it accepts semana_id)
# Frontend sends 'semana_id' via service.
url_summary = f"/bodega/tablero/summary/?bodega={BODEGA_ID}&temporada={TEMPORADA_ID}&semana_id={SEMANA_ID}"
print_section("1. SUMMARY RESPONSE", fetch_json(url_summary))

# 2. Queues (Checking if it accepts semana_id and type, and checking aliases)
url_queues = f"/bodega/tablero/queues/?bodega={BODEGA_ID}&temporada={TEMPORADA_ID}&semana_id={SEMANA_ID}&queue=inventarios"
# print_section("2. QUEUES RESPONSE", fetch_json(url_queues)) # Commented out full dump
print("\n--- 2. QUEUES ALIAS CHECK START ---")
try:
    resp = client.get(url_queues, HTTP_AUTHORIZATION=f'Bearer {TOKEN}')
    data = resp.json()
    results = data.get('data', {}).get('results', [])
    if results:
        item = results[0]
        print(f"Item fields: {list(item.keys())}")
        print(f"kg: {item.get('kg')}")
        print(f"cajas_campo: {item.get('cajas_campo')}")
        print(f"cantidad_cajas: {item.get('cantidad_cajas')}")
    else:
        print("No queue items found to verify aliases.")
except Exception as e:
    print(f"Error checking aliases: {e}")
print("--- 2. QUEUES ALIAS CHECK END ---")

# 3. Recepciones List (Checking for 500s)
url_recepciones = f"/bodega/recepciones/?page=1&page_size=10&bodega={BODEGA_ID}&temporada={TEMPORADA_ID}"
# Note: User asked to check if list throws 500 due to serializer
print_section("3. RECEPCIONES LIST RESPONSE", fetch_json(url_recepciones))

# 4. Recepcion Detail (Checking captured vs packed)
# Find a recepcion first
rec = Recepcion.objects.filter(bodega_id=BODEGA_ID, temporada_id=TEMPORADA_ID).last()
if rec:
    url_rec_detail = f"/bodega/recepciones/{rec.id}/"
    print_section(f"4. RECEPCION DETAIL RESPONSE (ID: {rec.id})", fetch_json(url_rec_detail))
else:
    print_section("4. RECEPCION DETAIL RESPONSE", "No recepcion found to test requests.")

# 5. Camiones List (Checking Drafts)
url_camiones_all = f"/bodega/camiones/?temporada={TEMPORADA_ID}&bodega={BODEGA_ID}"
# ...
url_camiones_draft = f"/bodega/camiones/?temporada={TEMPORADA_ID}&bodega={BODEGA_ID}&estado=BORRADOR" 
# Trying uppercase BORRADOR as per models.TextChoices usually being upper in API if using value, 
# but could be lower if using label or if serializer maps it.
# Let's try 'borrador' (lowercase) too if empty, but usually choices are case sensitive values.
# Model definition: BORRADOR = "BORRADOR", "Borrador"
# So value is "BORRADOR".
print_section("5. CAMIONES DRAFT (state=BORRADOR)", fetch_json(url_camiones_draft))

# 6. Serializer Lote Check (Forensic)
print("\n--- 6. SERIALIZER LOTE FORENSIC ---")
try:
    if rec:
        ser = RecepcionSerializer(rec)
        data = ser.data 
        print(f"Serialized 'lote_codigo': {data.get('lote_codigo')}")
        print(f"Serialized 'codigo_lote': {data.get('codigo_lote')}") # write_only, should be usually absent or handled
        print(f"Serialized keys: {list(data.keys())}")
    else:
        print("No recepcion to serialize.")
except Exception as e:
    print(f"Serializer Crashed: {e}")
    traceback.print_exc()
print("--- 6. SERIALIZER END ---")
