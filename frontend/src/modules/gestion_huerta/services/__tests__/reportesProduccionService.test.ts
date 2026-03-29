import { beforeEach, describe, expect, it, vi } from 'vitest';

import apiClient from '../../../../global/api/apiClient';
import { handleBackendNotification } from '../../../../global/utils/NotificationEngine';
import { reportesProduccionService } from '../reportesProduccionService';

vi.mock('../../../../global/api/apiClient', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('../../../../global/utils/NotificationEngine', () => ({
  handleBackendNotification: vi.fn(),
}));

const mockedPost = vi.mocked(apiClient.post);
const mockedNotification = vi.mocked(handleBackendNotification);
const YEARS_KEY = 'a\u00f1os';

describe('reportesProduccionService', () => {
  beforeEach(() => {
    mockedPost.mockReset();
    mockedNotification.mockReset();
  });

  it('envia force_refresh al reporte json de cosecha', async () => {
    mockedPost.mockResolvedValue({
      data: {
        data: {
          reporte: { id: 7, nombre: 'Reporte de prueba' },
        },
      },
    } as never);

    const result = await reportesProduccionService.generarReporteCosecha({
      cosecha_id: 7,
      formato: 'json',
      force_refresh: true,
    });

    expect(mockedPost).toHaveBeenCalledWith('/huerta/reportes/cosecha/', {
      cosecha_id: 7,
      formato: 'json',
      force_refresh: true,
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 7, nombre: 'Reporte de prueba' });
  });

  it('usa 5 anos por default en perfil de huerta json', async () => {
    mockedPost.mockResolvedValue({
      data: {
        data: {
          reporte: { ok: true },
        },
      },
    } as never);

    await reportesProduccionService.generarReportePerfilHuerta({
      formato: 'json',
      huerta_rentada_id: 9,
      force_refresh: true,
    });

    const payload = mockedPost.mock.calls[0][1] as Record<string, unknown>;
    expect(mockedPost.mock.calls[0][0]).toBe('/huerta/reportes/perfil-huerta/');
    expect(payload.formato).toBe('json');
    expect(payload.huerta_rentada_id).toBe(9);
    expect(payload.force_refresh).toBe(true);
    expect(payload[YEARS_KEY]).toBe(5);
  });

  it.each([
    ['cosecha', () => reportesProduccionService.generarReporteCosecha({ cosecha_id: 5, formato: 'pdf' })],
    ['temporada', () => reportesProduccionService.generarReporteTemporada({ temporada_id: 5, formato: 'pdf' })],
    ['perfil', () => reportesProduccionService.generarReportePerfilHuerta({ huerta_id: 5, formato: 'pdf' })],
  ])('retorna un error generico cuando falla la exportacion de %s sin payload interpretable', async (_kind, runRequest) => {
    mockedPost.mockImplementation(async () => {
      throw new Error('network');
    });

    const result = await runRequest();

    expect(result.success).toBe(false);
    expect(result.message).toBe('Error de conexion al generar el reporte');
    expect(result.errors).toEqual({ general: ['Error de red'] });
    expect(mockedNotification).not.toHaveBeenCalled();
  });
});
