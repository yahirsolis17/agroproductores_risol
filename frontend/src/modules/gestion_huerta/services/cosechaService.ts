/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from '../../../global/api/apiClient';
import { Cosecha, CosechaCreateData, CosechaUpdateData } from '../types/cosechaTypes';

export const cosechaService = {
  // LIST (con fallback a DRF nativo)
  async list(
    page: number = 1,
    temporadaId: number,
    search?: string,
    estado?: 'activas' | 'archivadas' | 'todas',
  ) {
    const params: Record<string, any> = { page, temporada: temporadaId };
    if (search) params['search'] = search;
    if (estado) params['estado'] = estado;

    // Intento 1: DRF nativo (count/results)
    const { data } = await apiClient.get<any>('/huerta/cosechas/', { params });
    if (data && typeof data.count === 'number' && Array.isArray(data.results)) {
      return {
        success: true,
        notification: { key: 'no_notification', message: '', type: 'info' as const },
        data: {
          cosechas: data.results as Cosecha[],
          meta: { count: data.count, next: data.next, previous: data.previous },
        },
      };
    }

    // Intento 2: envelope del backend
    const response = await apiClient.get<{
      success: boolean;
      notification: { key: string; message: string; type: 'success' | 'error' | 'warning' | 'info' };
      data: {
        cosechas: Cosecha[];
        meta: { count: number; next: string | null; previous: string | null };
      };
    }>('/huerta/cosechas/', { params });

    return response.data;
  },

  // CREATE
  async create(payload: CosechaCreateData) {
    const response = await apiClient.post<{
      success: boolean;
      notification: { key: string; message: string; type: 'success' | 'error' | 'warning' | 'info' };
      data: { cosecha: Cosecha };
    }>('/huerta/cosechas/', payload);
    return response.data;
  },

  // UPDATE (PATCH parcial)
  async update(id: number, payload: CosechaUpdateData) {
    const response = await apiClient.patch<{
      success: boolean;
      notification: { key: string; message: string; type: 'success' | 'error' | 'warning' | 'info' };
      data: { cosecha: Cosecha };
    }>(`/huerta/cosechas/${id}/`, payload);
    return response.data;
  },

  // DELETE
  async delete(id: number) {
    const response = await apiClient.delete<{
      success: boolean;
      notification: { key: string; message: string; type: 'success' | 'error' | 'warning' | 'info' };
      data: { info: string };
    }>(`/huerta/cosechas/${id}/`);
    return response.data;
  },

  // ARCHIVAR
  async archivar(id: number) {
    const response = await apiClient.post<{
      success: boolean;
      notification: { key: string; message: string; type: 'success' | 'error' | 'warning' | 'info' };
      data: { cosecha: Cosecha };
    }>(`/huerta/cosechas/${id}/archivar/`);
    return response.data;
  },

  // RESTAURAR
  async restaurar(id: number) {
    const response = await apiClient.post<{
      success: boolean;
      notification: { key: string; message: string; type: 'success' | 'error' | 'warning' | 'info' };
      data: { cosecha: Cosecha };
    }>(`/huerta/cosechas/${id}/restaurar/`);
    return response.data;
  },

  // FINALIZAR
  async finalizar(id: number) {
    const response = await apiClient.post<{
      success: boolean;
      notification: { key: string; message: string; type: 'success' | 'error' | 'warning' | 'info' };
      data: { cosecha: Cosecha };
    }>(`/huerta/cosechas/${id}/finalizar/`);
    return response.data;
  },

  // TOGGLE FINALIZADA
  async toggleFinalizada(id: number) {
    const response = await apiClient.post<{
      success: boolean;
      notification: { key: string; message: string; type: 'success' | 'error' | 'warning' | 'info' };
      data: { cosecha: Cosecha };
    }>(`/huerta/cosechas/${id}/toggle-finalizada/`);
    return response.data;
  },

  // REACTIVAR (alias de deshacer finalización)
  async reactivar(id: number) {
    const response = await apiClient.post<{
      success: boolean;
      notification: { key: string; message: string; type: 'success' | 'error' | 'warning' | 'info' };
      data: { cosecha: Cosecha };
    }>(`/huerta/cosechas/${id}/reactivar/`);
    return response.data;
  },

  async getById(id: number) {
    const response = await apiClient.get<{
      success: boolean;
      notification: { key: string; message: string; type: 'success' | 'error' | 'warning' | 'info' };
      data: { cosecha: Cosecha };
    }>(`/huerta/cosechas/${id}/`);
    return response.data;
  },
};
