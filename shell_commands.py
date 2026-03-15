# Commands para ejecutar en Django shell
# Ejecutar con: python shell_commands.py

import os
import sys

# Setup Django
sys.path.append(r'C:\Users\Yahir\agroproductores_risol\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agroproductores_risol.settings')

import django
django.setup()

from datetime import date, timedelta, datetime
from django.db import transaction
from gestion_bodega.models import *

# 1. Obtener contexto
bodega = Bodega.objects.first()
temporada = TemporadaBodega.objects.filter(bodega=bodega, is_active=True).first()
semana = CierreSemanal.objects.filter(bodega=bodega, temporada=temporada, fecha_hasta__isnull=True).first()

print(f"Bodega: {bodega.id}, Temporada: {temporada.id}, Semana: {semana.id if semana else 'NONE'}")

# 2. Limpiar datos anteriores
with transaction.atomic():
    ClasificacionEmpaque.objects.filter(temporada=temporada).update(is_active=False)
    LoteBodega.objects.filter(temporada=temporada).update(is_active=False)
    Recepcion.objects.filter(temporada=temporada).update(is_active=False)
    CamionConsumoEmpaque.objects.filter(camion__temporada=temporada).delete()
    CamionSalida.objects.filter(temporada=temporada).update(is_active=False)

# 3. Crear Recepciones (USAR HOY/AYER)
today = date.today()
run_token = datetime.now().strftime("%H%M%S")
r1 = Recepcion.objects.create(bodega=bodega, temporada=temporada, semana=semana, fecha=today-timedelta(days=1), huertero_nombre="TEST-Juan", tipo_mango="KENT", cajas_campo=150)
r2 = Recepcion.objects.create(bodega=bodega, temporada=temporada, semana=semana, fecha=today, huertero_nombre="TEST-MarÃ­a", tipo_mango="TOMMY", cajas_campo=200)

# 4. Crear Lotes
l1 = LoteBodega.objects.create(bodega=bodega, temporada=temporada, semana=semana, codigo_lote=f"TEST-{semana.id}-{run_token}-A", origen_nombre="TEST-Juan")
l2 = LoteBodega.objects.create(bodega=bodega, temporada=temporada, semana=semana, codigo_lote=f"TEST-{semana.id}-{run_token}-B", origen_nombre="TEST-MarÃ­a")

# 5. Crear Clasificaciones (desglose multilinea)
e11 = ClasificacionEmpaque.objects.create(bodega=bodega, temporada=temporada, semana=semana, lote=l1, recepcion=r1, fecha=today-timedelta(days=1), material="PLASTICO", calidad="PRIMERA", cantidad_cajas=100)
e12 = ClasificacionEmpaque.objects.create(bodega=bodega, temporada=temporada, semana=semana, lote=l1, recepcion=r1, fecha=today-timedelta(days=1), material="PLASTICO", calidad="TERCERA", cantidad_cajas=30)
e13 = ClasificacionEmpaque.objects.create(bodega=bodega, temporada=temporada, semana=semana, lote=l1, recepcion=r1, fecha=today-timedelta(days=1), material="MADERA", calidad="NINIO", cantidad_cajas=20)
e21 = ClasificacionEmpaque.objects.create(bodega=bodega, temporada=temporada, semana=semana, lote=l2, recepcion=r2, fecha=today, material="PLASTICO", calidad="PRIMERA", cantidad_cajas=150)
e22 = ClasificacionEmpaque.objects.create(bodega=bodega, temporada=temporada, semana=semana, lote=l2, recepcion=r2, fecha=today, material="PLASTICO", calidad="EXTRA", cantidad_cajas=50)

# 6. Crear Camiones (3 con estados diferentes para tabs)
c1 = CamionSalida.objects.create(bodega=bodega, temporada=temporada, numero=101, fecha_salida=today+timedelta(days=1), estado="BORRADOR")
CamionConsumoEmpaque.objects.create(camion=c1, clasificacion_empaque=e11, cantidad=50)

c2 = CamionSalida.objects.create(bodega=bodega, temporada=temporada, numero=102, fecha_salida=today+timedelta(days=2), estado="CONFIRMADO")
CamionConsumoEmpaque.objects.create(camion=c2, clasificacion_empaque=e21, cantidad=100)

c3 = CamionSalida.objects.create(bodega=bodega, temporada=temporada, numero=103, fecha_salida=today+timedelta(days=3), estado="BORRADOR")

print("\nâœ… Dataset creado!")
print(f"Bodega: {bodega.id}, Temporada: {temporada.id}")
print(f"Recepciones: {Recepcion.objects.filter(temporada=temporada, is_active=True).count()}")
print(f"Lotes: {LoteBodega.objects.filter(temporada=temporada, is_active=True).count()}")
print(f"Clasificaciones: {ClasificacionEmpaque.objects.filter(temporada=temporada, is_active=True).count()}")
print(f"Camiones: {CamionSalida.objects.filter(temporada=temporada, is_active=True).count()}")

