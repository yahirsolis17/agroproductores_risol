#!/usr/bin/env python
"""
Script simplificado para crear datos de prueba sin validaciones bloqueantes
"""
import os
import sys
import django
from datetime import date, timedelta

sys.path.append(r'C:\Users\Yahir\agroproductores_risol\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agroproductores_risol.settings')
django.setup()

from django.db import transaction
from gestion_bodega.models import (
    Bodega, TemporadaBodega, CierreSemanal,
    Recepcion, LoteBodega, ClasificacionEmpaque,
    CamionSalida, CamionItem
)

def create_simple_test_data():
    """Crea datos directamente sin pasar por validaciones complejas"""
    
    print("Buscando bodega y temporada existente...")
    bodega = Bodega.objects.first()
    temporada = TemporadaBodega.objects.filter(bodega=bodega, is_active=True).first()
    
    if not bodega or not temporada:
        print("❌ No hay bodega/temporada. Primero crea la estructura básica desde la UI.")
        return None
        
    print(f"✅ Bodega: {bodega.nombre} (ID: {bodega.id})")
    print(f"✅ Temporada: {temporada.año} (ID: {temporada.id})")
    
    # Buscar semana abierta
    semana = CierreSemanal.objects.filter(
        bodega=bodega,
        temporada=temporada,
        fecha_hasta__isnull=True,  # Semana abierta
        is_active=True
    ).first()
    
    if not semana:
        print("⚠️  No hay semana abierta. Creando una...")
        today = date.today()
        start = today - timedelta(days=today.weekday())
        semana = CierreSemanal.objects.create(
            bodega=bodega,
            temporada=temporada,
            fecha_desde=start,
            fecha_hasta=None,
            is_active=True
        )
    
    print(f"✅ Semana: {semana.fecha_desde} (ID: {semana.id}, abierta={semana.fecha_hasta is None})")
    
    # Limpiar datos viejos
    print("\n🧹 Limpiando datos de prueba anteriores...")
    ClasificacionEmpaque.objects.filter(temporada=temporada).update(is_active=False)
    LoteBodega.objects.filter(temporada=temporada).update(is_active=False)
    Recepcion.objects.filter(temporada=temporada).update(is_active=False)
    CamionItem.objects.filter(camion__temporada=temporada).delete()
    CamionSalida.objects.filter(temporada=temporada).update(is_active=False)
    
    today = date.today()
    
    with transaction.atomic():
        print("\n📦 Creando Recepciones...")
        # Usar HOY y AYER para pasar validación
        r1 = Recepcion.objects.create(
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            fecha=today - timedelta(days=1),  # AYER
            huertero_nombre="Juan Pérez - TEST",
            tipo_mango="KENT",
            cajas_campo=150
        )
        print(f"  → {r1.huertero_nombre}: {r1.cajas_campo} cajas")
        
        r2 = Recepcion.objects.create(
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            fecha=today,  # HOY
            huertero_nombre="María García - TEST",
            tipo_mango="TOMMY",
            cajas_campo=200
        )
        print(f"  → {r2.huertero_nombre}: {r2.cajas_campo} cajas")
        
        print("\n📋 Creando Lotes...")
        l1 = LoteBodega.objects.create(
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            codigo_lote=f"TEST-{semana.id}-001",
            origen_nombre=r1.huertero_nombre
        )
        print(f"  → {l1.codigo_lote}")
        
        l2 = LoteBodega.objects.create(
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            codigo_lote=f"TEST-{semana.id}-002",
            origen_nombre=r2.huertero_nombre
        )
        print(f"  → {l2.codigo_lote}")
        
        print("\n🏷️  Creando Clasificaciones...")
        # Lote 1: 3 clasificaciones
        e11 = ClasificacionEmpaque.objects.create(
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            lote=l1,
            recepcion=r1,
            fecha=today - timedelta(days=1),  # AYER
            material="PLASTICO",
            calidad="PRIMERA",
            cantidad_cajas=100
        )
        print(f"  → {e11.calidad} ({e11.material}): {e11.cantidad_cajas}")
        
        e12 = ClasificacionEmpaque.objects.create(
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            lote=l1,
            recepcion=r1,
            fecha=today - timedelta(days=1),  # AYER
            material="PLASTICO",
            calidad="TERCERA",
            cantidad_cajas=30
        )
        print(f"  → {e12.calidad} ({e12.material}): {e12.cantidad_cajas}")
        
        e13 = ClasificacionEmpaque.objects.create(
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            lote=l1,
            recepcion=r1,
            fecha=today - timedelta(days=1),  # AYER
            material="MADERA",
            calidad="NINIO",
            cantidad_cajas=20
        )
        print(f"  → {e13.calidad} ({e13.material}): {e13.cantidad_cajas}")
        
        # Lote 2: 2 clasificaciones
        e21 = ClasificacionEmpaque.objects.create(
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            lote=l2,
            recepcion=r2,
            fecha=today,  # HOY
            material="PLASTICO",
            calidad="PRIMERA",
            cantidad_cajas=150
        )
        print(f"  → {e21.calidad} ({e21.material}): {e21.cantidad_cajas}")
        
        e22 = ClasificacionEmpaque.objects.create(
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            lote=l2,
            recepcion=r2,
            fecha=today,  # HOY
            material="PLASTICO",
            calidad="EXTRA",
            cantidad_cajas=50
        )
        print(f"  → {e22.calidad} ({e22.material}): {e22.cantidad_cajas}")
        
        print("\n🚛 Creando Despachos...")
        c1 = CamionSalida.objects.create(
            bodega=bodega,
            temporada=temporada,
            numero="TEST-001",
            fecha_salida=today + timedelta(days=1),
            estado="BORRADOR"
        )
        print(f"  → {c1.numero} ({c1.estado})")
        
        CamionItem.objects.create(
            camion=c1,
            clasificacion=e11,
            lote=l1,
            tipo_mango="KENT",
            cantidad_cajas=50
        )
        
        c2 = CamionSalida.objects.create(
            bodega=bodega,
            temporada=temporada,
            numero="TEST-002",
            fecha_salida=today + timedelta(days=2),
            estado="CONFIRMADO"
        )
        print(f"  → {c2.numero} ({c2.estado})")
        
        CamionItem.objects.create(
            camion=c2,
            clasificacion=e21,
            lote=l2,
            tipo_mango="TOMMY",
            cantidad_cajas=100
        )
        
        c3 = CamionSalida.objects.create(
            bodega=bodega,
            temporada=temporada,
            numero="TEST-003",
            fecha_salida=today + timedelta(days=3),
            estado="BORRADOR"
        )
        print(f"  → {c3.numero} ({c3.estado})")
    
    print("\n✅ Dataset creado exitosamente!")
    print(f"\n🔍 IDs para testing:")
    print(f"  bodega={bodega.id}&temporada={temporada.id}&semana_id={semana.id}")
    
    return {
        "bodega_id": bodega.id,
        "temporada_id": temporada.id,
        "semana_id": semana.id
    }

if __name__ == "__main__":
    ids = create_simple_test_data()
    if ids:
        print(f"\n📋 IDs: {ids}")
