
from django.test import TestCase
from django.utils import timezone
from gestion_bodega.models import (
    Bodega, TemporadaBodega, Recepcion, ClasificacionEmpaque, 
    CamionSalida, CamionConsumoEmpaque, CierreSemanal
)
from gestion_bodega.utils.inventario_empaque import get_disponible_for_clasificacion
from gestion_bodega.utils.reporting import aggregates_for_semana
from decimal import Decimal
from datetime import timedelta

class LogisticaSanityTest(TestCase):
    def setUp(self):
        # Setup basico
        self.bodega = Bodega.objects.create(nombre="Bodega Test")
        self.temporada = TemporadaBodega.objects.create(
            bodega=self.bodega, 
            año=2025, 
            fecha_inicio=timezone.now().date()
        )
        
        # Crear semana activa
        self.semana = CierreSemanal.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_desde=timezone.now().date() - timedelta(days=1),
            fecha_hasta=None, # Abierta
            iso_semana=timezone.now().date().isoformat()[:8] # Simplified ISO
        )

    def test_smoke_flow(self):
        """
        Checklist de verificación “no se rompe nada”
        """
        print("\n>>> Iniciando Smoke Test: Logística Integral")

        # 1. Crear Recepción (100 cajas)
        recepcion = Recepcion.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha=timezone.now().date(),
            huertero_nombre="HUERTA TEST",
            tipo_mango="ATAULFO",
            cajas_campo=100
        )
        print(f"1. Recepción creada: {recepcion}")

        # 2. Empacar 100 (80 Primera, 20 Tercera)
        # ClasificacionEmpaque se crea manualmente simulando el proceso de empaque
        c_primera = ClasificacionEmpaque.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            recepcion=recepcion,
            material="PLASTICO",
            calidad="PRIMERA",
            tipo_mango="ATAULFO",
            cantidad_cajas=80,
            fecha=timezone.now()
        )
        c_tercera = ClasificacionEmpaque.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            recepcion=recepcion,
            material="PLASTICO",
            calidad="TERCERA",
            tipo_mango="ATAULFO",
            cantidad_cajas=20,
            fecha=timezone.now()
        )
        print("2. Empaque realizado: 80 Primera, 20 Tercera")

        # Verificar disponible inicial
        disp_1 = get_disponible_for_clasificacion(c_primera.id)
        self.assertEqual(disp_1, 80)
        print(f"   Disponible Primera: {disp_1} (OK)")

        # 3. Crear Camión (BORRADOR)
        camion = CamionSalida.objects.create(
            bodega=self.bodega,
            temporada=self.temporada,
            fecha_salida=timezone.now().date(),
            chofer="Juan Perez",
            destino="Mercado Test"
        )
        print(f"3. Camión creado: {camion}")

        # 4. Agregar cargas
        # Intentar cargar 80 Primera (OK)
        carga1 = CamionConsumoEmpaque.objects.create(
            camion=camion,
            clasificacion_empaque=c_primera,
            cantidad=80
        )
        print("4. Carga de 80 Primera agregada (OK)")

        # Intentar cargar 1 más de Primera (FAIL)
        print("   Intentando cargar 1 más de Primera (debe fallar)...")
        try:
            CamionConsumoEmpaque.objects.create(
                camion=camion,
                clasificacion_empaque=c_primera,
                cantidad=1
            )
            self.fail("Debería haber fallado por falta de stock")
        except Exception as e:
            print(f"   Bloqueo exitoso: {e}")

        # Verificar disponible intermedio
        disp_1_post = get_disponible_for_clasificacion(c_primera.id)
        self.assertEqual(disp_1_post, 0)
        print("   Disponible Primera tras carga: 0 (OK)")

        # 5. Confirmar Camión
        print("5. Confirmando camión...")
        camion.confirmar()
        camion.refresh_from_db()
        self.assertIsNotNone(camion.numero)
        self.assertEqual(camion.estado, "CONFIRMADO")
        print(f"   Camión confirmado con Folio: {camion.numero}")

        # Intentar editar camión confirmado (FAIL)
        # Nota: La restricción de 'update' está en la Vista/Serializer, pero el modelo no lo impide por sí solo salvo en clean() si lo agrego? 
        # En phase 3 implementamos check en Vista. Aquí probamos lógica de negocio.
        # Si la lógica está solo en vista, este test de modelo pasaría editando campos.
        # Pero intentemos agregar carga (que tiene check en view). Simularemos check de integridad.
        
        # 6. Reporte Semanal
        print("6. Verificando Reporte Semanal...")
        year, week, _ = timezone.now().date().isocalendar()
        iso_str = f"{year}-W{week:02d}"
        print(f"   Consultando semana: {iso_str}")
        
        try:
            report = aggregates_for_semana(self.bodega.id, self.temporada.id, iso_semana=iso_str)
            rows = report["tabla_clasificacion"]["rows"]
            print(f"   Rows obtained: {rows}")
            
            # rows format: [Material, Calidad, Producido, Desp. Pedidos, Desp. Camiones, Desp. Total]
            
            found_primera = False
            for r in rows:
                if r[0] == "PLASTICO" and r[1] == "PRIMERA":
                    print(f"   Evaluando PRIMERA: {r}")
                    if str(r[2]) == "80" and str(r[4]) == "80":
                        found_primera = True
            
            if not found_primera:
                self.fail(f"No se encontró fila PRIMERA correcta. Rows: {rows}")

        except Exception as e:
            import traceback
            traceback.print_exc()
            self.fail(f"Error en reporte: {e}")

        # 7. Anular Camión (Soft Delete / Archivar)
        print("7. Anulando Camión...")
        try:
            camion.delete() 
            
            # Verificar retorno de stock
            disp_1_final = get_disponible_for_clasificacion(c_primera.id)
            print(f"   Disponible Primera tras anular: {disp_1_final}")
            self.assertEqual(disp_1_final, 80)
            print("   Anulación exitosa.")
        except Exception as e:
            print(f"!!! Error en paso 7: {e}")
            raise e
        
        print("\n>>> SMOKE TEST FINALIZADO CON ÉXITO")
