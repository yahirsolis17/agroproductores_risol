// src/modules/gestion_huerta/services/temporadaService.ts
import apiClient from '../../../global/api/apiClient';
import { Temporada, TemporadaCreateData, EstadoTemporada } from '../types/temporadaTypes';

type Notif = { key: string; message: string; type: 'success' | 'error' | 'warning' | 'info' };
type Meta = { count: number; next: string | null; previous: string | null };

export const temporadaService = {
  async list(
    page: number = 1,
    año?: number,
    huertaId?: number,
    huertaRentadaId?: number,
    estado?: EstadoTemporada,                // 👈 clave: usar EstadoTemporada aquí
    finalizada?: boolean,
    search?: string
  ) {
    const params: Record<string, any> = { page, page_size: 10 };
    if (año) params['año'] = año;
    if (huertaId) params['huerta'] = huertaId;
    if (huertaRentadaId) params['huerta_rentada'] = huertaRentadaId;
    if (estado) params['estado'] = estado;
    if (finalizada !== undefined) params['finalizada'] = finalizada;
    if (search) params['search'] = search;

    const { data } = await apiClient.get<any>('/huerta/temporadas/', { params });

    if (data && data.success === true && data.data && Array.isArray(data.data.temporadas)) {
      return data as { success: boolean; notification: Notif; data: { temporadas: Temporada[]; meta: Meta } };
    }

    if (data && typeof data.count === 'number' && Array.isArray(data.results)) {
      return {
        success: true,
        notification: { key: 'no_notification', message: '', type: 'info' } as Notif,
        data: {
          temporadas: data.results as Temporada[],
          meta: { count: data.count, next: data.next, previous: data.previous } as Meta,
        },
      };
    }

    return {
      success: true,
      notification: { key: 'no_notification', message: '', type: 'info' } as Notif,
      data: {
        temporadas: [],
        meta: { count: 0, next: null, previous: null } as Meta,
      },
    };
  },

  async create(payload: TemporadaCreateData) {
    const response = await apiClient.post<{
      success: boolean;
      notification: Notif;
      data: { temporada: Temporada };
    }>('/huerta/temporadas/', payload);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete<{
      success: boolean;
      notification: Notif;
      data: { info: string };
    }>(`/huerta/temporadas/${id}/`);
    return response.data;
  },

  async finalizar(id: number) {
    const response = await apiClient.post<{
      success: boolean;
      notification: Notif;
      data: { temporada: Temporada };
    }>(`/huerta/temporadas/${id}/finalizar/`);
    return response.data;
  },

  async archivar(id: number) {
    const response = await apiClient.post<{
      success: boolean;
      notification: Notif;
      data: { temporada: Temporada };
    }>(`/huerta/temporadas/${id}/archivar/`);
    return response.data;
  },

  async restaurar(id: number) {
    const response = await apiClient.post<{
      success: boolean;
      notification: Notif;
      data: { temporada: Temporada };
    }>(`/huerta/temporadas/${id}/restaurar/`);
    return response.data;
  },

  getById(id: number): Promise<{ data: { temporada: Temporada } }> {
    return apiClient
      .get<Temporada>(`/huerta/temporadas/${id}/`)
      .then((res) => ({
        data: { temporada: res.data },
      }));
  },
};
