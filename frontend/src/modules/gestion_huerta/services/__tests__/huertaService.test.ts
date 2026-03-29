import { beforeEach, describe, expect, it, vi } from 'vitest';

import apiClient from '../../../../global/api/apiClient';
import { huertaService } from '../huertaService';
import { huertaRentadaService } from '../huertaRentadaService';

vi.mock('../../../../global/api/apiClient', () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockedGet = vi.mocked(apiClient.get);

describe('huertaService.getById', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('normaliza un retrieve crudo de DRF para huerta propia', async () => {
    mockedGet.mockResolvedValue({
      data: {
        id: 7,
        nombre: 'La Esperanza',
        ubicacion: 'Escuinapa',
        variedades: 'Ataulfo',
        historial: null,
        hectareas: 12.5,
        propietario: 3,
        propietario_detalle: {
          id: 3,
          nombre: 'Juan',
          apellidos: 'Perez',
        },
        propietario_archivado: false,
        is_active: true,
        archivado_en: null,
      },
    } as never);

    const result = await huertaService.getById(7);

    expect(mockedGet).toHaveBeenCalledWith('/huerta/huertas/7/');
    expect(result).toMatchObject({
      id: 7,
      nombre: 'La Esperanza',
      propietario: 3,
      is_active: true,
    });
    expect(result.propietario_detalle?.nombre).toBe('Juan');
  });

  it('acepta tambien el envelope legacy para huerta propia', async () => {
    mockedGet.mockResolvedValue({
      data: {
        data: {
          huerta: {
            id: 9,
            nombre: 'San Miguel',
            ubicacion: 'Rosario',
            variedades: 'Kent',
            historial: '2024',
            hectareas: 8,
            propietario: 5,
            propietario_detalle: {
              id: 5,
              nombre: 'Ana',
              apellidos: 'Lopez',
            },
            propietario_archivado: false,
            is_active: false,
            archivado_en: '2026-03-01T00:00:00Z',
          },
        },
      },
    } as never);

    const result = await huertaService.getById(9);

    expect(result).toMatchObject({
      id: 9,
      nombre: 'San Miguel',
      is_active: false,
    });
    expect(result.propietario_detalle?.apellidos).toBe('Lopez');
  });
});

describe('huertaRentadaService.getById', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('normaliza un retrieve crudo de DRF para huerta rentada', async () => {
    mockedGet.mockResolvedValue({
      data: {
        id: 4,
        nombre: 'La Renta',
        ubicacion: 'Mazatlan',
        variedades: 'Tommy',
        historial: null,
        hectareas: 6,
        propietario: 2,
        propietario_detalle: {
          id: 2,
          nombre: 'Maria',
          apellidos: 'Garcia',
        },
        propietario_archivado: false,
        monto_renta: '12000.50',
        monto_renta_palabras: 'Doce mil pesos',
        is_active: true,
        archivado_en: null,
      },
    } as never);

    const result = await huertaRentadaService.getById(4);

    expect(mockedGet).toHaveBeenCalledWith('/huerta/huertas-rentadas/4/');
    expect(result).toMatchObject({
      id: 4,
      nombre: 'La Renta',
      monto_renta: 12000.5,
      is_active: true,
    });
    expect(result.propietario_detalle?.nombre).toBe('Maria');
  });
});
