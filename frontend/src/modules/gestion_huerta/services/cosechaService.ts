// src/modules/gestion_huerta/services/cosechaService.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from '../../../global/api/apiClient';
import { Cosecha, CosechaCreateData, CosechaUpdateData } from '../types/cosechaTypes';

type Notif = { key: string; message: string; type: 'success' | 'error' | 'warning' | 'info' };
type Meta  = { count: number; next: string | null; previous: string | null };

export const cosechaService = {
  // LIST (una sola llamada, con fallback a DRF nativo o envelope)
  async list(
    page: number = 1,
    temporadaId: number,
    search?: string,
    estado?: 'activas' | 'archivadas' | 'todas',
    finalizada?: boolean,          // 👈 NUEVO: filtro opcional, igual que en Temporadas
  ) {
    const params: Record<string, any> = { page, page_size: 10, temporada: temporadaId };
    if (search) params['search'] = search;
    if (estado) params['estado'] = estado;
    if (finalizada !== undefined) params['finalizada'] = finalizada;

    const { data } = await apiClient.get<any>('/huerta/cosechas/', { params });

    // Fallback DRF nativo (count/results)
    // Fallback DRF nativo
    if (data && typeof data.count === 'number' && Array.isArray(data.results)) {
      return {
        success: true,
        notification: { key: 'no_notification', message: '', type: 'info' as const },
        data: {
          cosechas: data.results as Cosecha[],
          meta: {
            count: data.count,
            next: data.next,
            previous: data.previous,
            total_registradas: data.count, // 👈 cuando no viene del envelope, usamos count
          } as Meta,
        },
      };
    }


    // Envelope de tu backend
    return data as {
      success: boolean;
      notification: Notif;
      data: { cosechas: Cosecha[]; meta: Meta };
    };
  },

  // CREATE
  async create(payload: CosechaCreateData) {
    const response = await apiClient.post<{
      success: boolean;
      notification: Notif;
      data: { cosecha: Cosecha };
    }>('/huerta/cosechas/', payload);
    return response.data;
  },

  // UPDATE (PATCH parcial)
  async update(id: number, payload: CosechaUpdateData) {
    const response = await apiClient.patch<{
      success: boolean;
      notification: Notif;
      data: { cosecha: Cosecha };
    }>(`/huerta/cosechas/${id}/`, payload);
    return response.data;
  },

  // DELETE
  async delete(id: number) {
    const response = await apiClient.delete<{
      success: boolean;
      notification: Notif;
      data: { info: string };
    }>(`/huerta/cosechas/${id}/`);
    return response.data;
  },

  // ARCHIVAR
  async archivar(id: number) {
    const response = await apiClient.post<{
      success: boolean;
      notification: Notif;
      data: { cosecha: Cosecha };
    }>(`/huerta/cosechas/${id}/archivar/`);
    return response.data;
  },

  // RESTAURAR
  async restaurar(id: number) {
    const response = await apiClient.post<{
      success: boolean;
      notification: Notif;
      data: { cosecha: Cosecha };
    }>(`/huerta/cosechas/${id}/restaurar/`);
    return response.data;
  },

  // FINALIZAR
  async finalizar(id: number) {
    const response = await apiClient.post<{
      success: boolean;
      notification: Notif;
      data: { cosecha: Cosecha };
    }>(`/huerta/cosechas/${id}/finalizar/`);
    return response.data;
  },

  // TOGGLE FINALIZADA
  async toggleFinalizada(id: number) {
    const response = await apiClient.post<{
      success: boolean;
      notification: Notif;
      data: { cosecha: Cosecha };
    }>(`/huerta/cosechas/${id}/toggle-finalizada/`);
    return response.data;
  },

  // REACTIVAR (alias de deshacer finalización)
  async reactivar(id: number) {
    const response = await apiClient.post<{
      success: boolean;
      notification: Notif;
      data: { cosecha: Cosecha };
    }>(`/huerta/cosechas/${id}/reactivar/`);
    return response.data;
  },

  // GET BY ID (normalizado)
  getById(id: number): Promise<{ data: { cosecha: Cosecha } }> {
    return apiClient
      .get<Cosecha>(`/huerta/cosechas/${id}/`)
      .then((res) => ({ data: { cosecha: res.data } }));
  },
};
