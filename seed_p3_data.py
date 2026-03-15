import os
import sys

import django
from django.utils import timezone

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.append(r'C:\Users\Yahir\agroproductores_risol\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agroproductores_risol.settings')
django.setup()

from gestion_bodega.models import (
    Bodega,
    TemporadaBodega,
    CierreSemanal,
    Recepcion,
    LoteBodega,
    ClasificacionEmpaque,
    CamionSalida,
    CamionConsumoEmpaque,
)


def seed() -> None:
    print('Seeding P3 Data (validando IDs canonicos)...')

    try:
        bodega = Bodega.objects.get(pk=16)
        temporada = TemporadaBodega.objects.get(pk=8)
    except Bodega.DoesNotExist:
        print('No se encontro Bodega 16.')
        return
    except TemporadaBodega.DoesNotExist:
        print('No se encontro Temporada 8.')
        return

    today = timezone.localdate()
    semana, created = CierreSemanal.objects.get_or_create(
        bodega=bodega,
        temporada=temporada,
        fecha_hasta__isnull=True,
        defaults={'fecha_desde': today},
    )
    if created:
        print(f'Semana abierta creada: ID={semana.id} ({semana.fecha_desde})')
    else:
        print(f'Usando semana abierta existente: ID={semana.id} ({semana.fecha_desde})')

    recepcion = Recepcion.objects.create(
        bodega=bodega,
        temporada=temporada,
        semana=semana,
        fecha=today,
        huertero_nombre='Huertero P3 Test',
        cajas_campo=100,
        tipo_mango='KENT',
    )
    print(f'Recepcion creada: ID={recepcion.id}')

    lote = LoteBodega.objects.create(
        bodega=bodega,
        temporada=temporada,
        semana=semana,
        codigo_lote=f'LOT-P3-{timezone.now().timestamp()}',
        origen_nombre='Origen Seed P3',
    )
    recepcion.lote = lote
    recepcion.save()

    clasificacion = ClasificacionEmpaque.objects.create(
        lote=lote,
        calidad='PRIMERA',
        cantidad_cajas=50,
        fecha=timezone.now(),
        is_active=True,
    )
    print(f'Inventario creado: Lote ID={lote.id} (Clasif ID={clasificacion.id})')

    folio_mock = f'BOD-{bodega.id}-T{temporada.id}-W{semana.id}-C99999'
    camion = CamionSalida.objects.create(
        bodega=bodega,
        temporada=temporada,
        semana=semana,
        fecha_salida=semana.fecha_desde,
        numero=99999,
        estado='CONFIRMADO',
        folio=folio_mock,
    )
    CamionConsumoEmpaque.objects.create(
        camion=camion,
        clasificacion_empaque=clasificacion,
        cantidad=50,
    )
    print(f'Camion creado: ID={camion.id} Folio={camion.folio}')
    print(f'Consumo creado: Lote {lote.id} despachado en Camion {camion.id}')

    print('\nSeed completado. Ejecuta python test_all_endpoints.py para verificar P3 IDs.')


if __name__ == '__main__':
    seed()
