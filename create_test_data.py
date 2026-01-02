#!/usr/bin/env python
"""
Script para crear datos de prueba completos para verificar:
- Empaque (agrupación, desglose, totales)
- Logística (tabs, filtros, estados)
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
from gestion_usuarios.models import Users

def create_complete_test_dataset():
    """Crea un dataset completo para pruebas end-to-end"""
    
    print("=" * 60)
    print("CREANDO DATASET DE PRUEBA COMPLETO")
    print("=" * 60)
    
    # 1. Obtener o crear usuario de prueba
    user, _ = Users.objects.get_or_create(
        telefono="1234567890",
        defaults={
            "nombre": "Test",
            "apellido": "User",
            "is_staff": True,
            "is_superuser": True
        }
    )
    if not user.check_password("testpassword123"):
        user.set_password("testpassword123")
        user.save()
    print(f"✅ Usuario: {user.telefono}")
    
    # 2. Obtener o crear Bodega
    bodega, created = Bodega.objects.get_or_create(
        nombre="risol",
        defaults={"direccion": "Test Address"}
    )
    print(f"✅ Bodega: {bodega.nombre} (ID: {bodega.id}) {'[CREADA]' if created else '[EXISTENTE]'}")
    
    # 3. Obtener o crear Temporada
    temporada, created = TemporadaBodega.objects.get_or_create(
        bodega=bodega,
        año=2025,
        defaults={"is_active": True, "finalizada": False}
    )
    print(f"✅ Temporada: {temporada.año} (ID: {temporada.id}) {'[CREADA]' if created else '[EXISTENTE]'}")
    
    # 4. Crear o usar semana actual
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())  # Lunes
    
    semana, created = CierreSemanal.objects.get_or_create(
        bodega=bodega,
        temporada=temporada,
        fecha_desde=start_of_week,
        defaults={
            "fecha_hasta": None,  # Semana abierta
            "locked_by": user,
            "is_active": True
        }
    )
    print(f"✅ Semana: {semana.fecha_desde} (ID: {semana.id}) {'[CREADA]' if created else '[EXISTENTE]'}")
    
    with transaction.atomic():
        # 5. CREAR RECEPCIONES (2 recepciones diferentes)
        print("\n📦 Creando Recepciones...")
        
        recepcion1 = Recepcion.objects.create(
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            fecha=today - timedelta(days=2),
            huertero_nombre="Juan Pérez",
            tipo_mango="KENT",
            cajas_campo=150
        )
        print(f"  → Recepción 1: {recepcion1.huertero_nombre} - {recepcion1.cajas_campo} cajas")
        
        recepcion2 = Recepcion.objects.create(
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            fecha=today - timedelta(days=1),
            huertero_nombre="María García",
            tipo_mango="TOMMY",
            cajas_campo=200,
            created_by=user
        )
        print(f"  → Recepción 2: {recepcion2.huertero_nombre} - {recepcion2.cajas_campo} cajas")
        
        # 6. CREAR LOTES (1 lote por recepción)
        print("\n📋 Creando Lotes...")
        
        lote1 = LoteBodega.objects.create(
            bodega=bodega,
            temporada=temporada,
            codigo_lote=f"LOTE-{semana.id}-001",
            recepcion=recepcion1,
            tipo_mango="KENT",
            created_by=user
        )
        print(f"  → Lote 1: {lote1.codigo_lote}")
        
        lote2 = LoteBodega.objects.create(
            bodega=bodega,
            temporada=temporada,
            codigo_lote=f"LOTE-{semana.id}-002",
            recepcion=recepcion2,
            tipo_mango="TOMMY",
            created_by=user
        )
        print(f"  → Lote 2: {lote2.codigo_lote}")
        
        # 7. CREAR CLASIFICACIONES EMPAQUE (múltiples por lote para desglose)
        print("\n🏷️  Creando Clasificaciones Empaque...")
        
        # Lote 1: 3 clasificaciones
        emp1_1 = ClasificacionEmpaque.objects.create(
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            lote=lote1,
            recepcion=recepcion1,
            fecha=today - timedelta(days=2),
            material="PLASTICO",
            calidad="PRIMERA",
            cantidad_cajas=100,
            created_by=user
        )
        print(f"  → Emp 1.1: {emp1_1.calidad} ({emp1_1.material}) = {emp1_1.cantidad_cajas}")
        
        emp1_2 = ClasificacionEmpaque.objects.create(
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            lote=lote1,
            recepcion=recepcion1,
            fecha=today - timedelta(days=2),
            material="PLASTICO",
            calidad="TERCERA",
            cantidad_cajas=30,
            created_by=user
        )
        print(f"  → Emp 1.2: {emp1_2.calidad} ({emp1_2.material}) = {emp1_2.cantidad_cajas}")
        
        emp1_3 = ClasificacionEmpaque.objects.create(
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            lote=lote1,
            recepcion=recepcion1,
            fecha=today - timedelta(days=2),
            material="MADERA",
            calidad="NINIO",
            cantidad_cajas=20,
            created_by=user
        )
        print(f"  → Emp 1.3: {emp1_3.calidad} ({emp1_3.material}) = {emp1_3.cantidad_cajas}")
        
        # Lote 2: 2 clasificaciones
        emp2_1 = ClasificacionEmpaque.objects.create(
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            lote=lote2,
            recepcion=recepcion2,
            fecha=today - timedelta(days=1),
            material="PLASTICO",
            calidad="PRIMERA",
            cantidad_cajas=150,
            created_by=user
        )
        print(f"  → Emp 2.1: {emp2_1.calidad} ({emp2_1.material}) = {emp2_1.cantidad_cajas}")
        
        emp2_2 = ClasificacionEmpaque.objects.create(
            bodega=bodega,
            temporada=temporada,
            semana=semana,
            lote=lote2,
            recepcion=recepcion2,
            fecha=today - timedelta(days=1),
            material="PLASTICO",
            calidad="EXTRA",
            cantidad_cajas=50,
            created_by=user
        )
        print(f"  → Emp 2.2: {emp2_2.calidad} ({emp2_2.material}) = {emp2_2.cantidad_cajas}")
        
        # 8. CREAR DESPACHOS (Camiones en diferentes estados para tabs)
        print("\n🚛 Creando Despachos...")
        
        # Borrador
        camion1 = CamionSalida.objects.create(
            bodega=bodega,
            temporada=temporada,
            numero="CAM-001",
            fecha_salida=today + timedelta(days=1),
            estado="BORRADOR",
            created_by=user
        )
        print(f"  → Camión 1: {camion1.numero} - {camion1.estado}")
        
        # Items del camión 1
        CamionItem.objects.create(
            camion=camion1,
            clasificacion=emp1_1,
            lote=lote1,
            tipo_mango="KENT",
            cantidad_cajas=50,
            created_by=user
        )
        
        # Confirmado
        camion2 = CamionSalida.objects.create(
            bodega=bodega,
            temporada=temporada,
            numero="CAM-002",
            fecha_salida=today + timedelta(days=2),
            estado="CONFIRMADO",
            created_by=user
        )
        print(f"  → Camión 2: {camion2.numero} - {camion2.estado}")
        
        # Items del camión 2
        CamionItem.objects.create(
            camion=camion2,
            clasificacion=emp2_1,
            lote=lote2,
            tipo_mango="TOMMY",
            cantidad_cajas=100,
            created_by=user
        )
        
        # Otro Borrador
        camion3 = CamionSalida.objects.create(
            bodega=bodega,
            temporada=temporada,
            numero="CAM-003",
            fecha_salida=today + timedelta(days=3),
            estado="BORRADOR",
            created_by=user
        )
        print(f"  → Camión 3: {camion3.numero} - {camion3.estado}")
    
    print("\n" + "=" * 60)
    print("✅ DATASET CREADO EXITOSAMENTE")
    print("=" * 60)
    print(f"\n📊 Resumen:")
    print(f"  - Bodega ID: {bodega.id}")
    print(f"  - Temporada ID: {temporada.id}")
    print(f"  - Semana ID: {semana.id}")
    print(f"  - Recepciones: 2")
    print(f"  - Lotes: 2")
    print(f"  - Clasificaciones: 5 (desglose)")
    print(f"  - Despachos: 3 (2 BORRADOR, 1 CONFIRMADO)")
    print(f"\n🔍 Para verificar, usa estos IDs:")
    print(f"  temporada={temporada.id}&bodega={bodega.id}")
    
    return {
        "bodega_id": bodega.id,
        "temporada_id": temporada.id,
        "semana_id": semana.id
    }

if __name__ == "__main__":
    ids = create_complete_test_dataset()
    print(f"\nIDs para testing: {ids}")
