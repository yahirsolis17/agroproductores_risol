// src/modules/gestion_huerta/services/temporadaService.ts
import apiClient from '../../../global/api/apiClient';
import { Temporada, TemporadaCreateData } from '../types/temporadaTypes';

export const temporadaService = {
  async list(
    page: number = 1,
    año?: number,
    huertaId?: number,
    huertaRentadaId?: number,
    estado?: 'activas' | 'archivadas' | 'todas',
    finalizada?: boolean,
    search?: string
  ) {
    const params: Record<string, any> = { page };
    if (año) params['año'] = año;
    if (huertaId) params['huerta'] = huertaId;
    if (huertaRentadaId) params['huerta_rentada'] = huertaRentadaId;
    if (estado) params['estado'] = estado;
    if (finalizada !== undefined) params['finalizada'] = finalizada;
    if (search) params['search'] = search;

    const response = await apiClient.get<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: {
        temporadas: Temporada[];
        meta: { count: number; next: string | null; previous: string | null };
      };
    }>('/huerta/temporadas/', { params });
    return response.data;
  },

  async create(payload: TemporadaCreateData) {
    const response = await apiClient.post<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { temporada: Temporada };
    }>('/huerta/temporadas/', payload);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { info: string };
    }>(`/huerta/temporadas/${id}/`);
    return response.data;
  },

  async finalizar(id: number) {
    const response = await apiClient.post<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { temporada: Temporada };
    }>(`/huerta/temporadas/${id}/finalizar/`);
    return response.data;
  },

  async archivar(id: number) {
    const response = await apiClient.post<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { temporada: Temporada };
    }>(`/huerta/temporadas/${id}/archivar/`);
    return response.data;
  },

  async restaurar(id: number) {
    const response = await apiClient.post<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { temporada: Temporada };
    }>(`/huerta/temporadas/${id}/restaurar/`);
    return response.data;
  },

  // 👇 TIPADO EXPLÍCITO DEL RETORNO
  getById(id: number): Promise<{ data: { temporada: Temporada } }> {
    return apiClient
      .get<Temporada>(`/huerta/temporadas/${id}/`)
      .then((res) => ({
        data: { temporada: res.data },
      }));
  },
};
