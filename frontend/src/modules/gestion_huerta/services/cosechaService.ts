/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from '../../../global/api/apiClient';
import { Cosecha, CosechaCreateData, CosechaUpdateData } from '../types/cosechaTypes';

export const cosechaService = {
  async list(
    page: number = 1,
    temporadaId: number,
    search?: string,
    finalizada?: boolean,
    estado?: 'activas' | 'archivadas' | 'todas',
  ) {
    const params: Record<string, any> = { page, temporada: temporadaId };
    if (search) params.search = search;
    if (finalizada !== undefined && finalizada !== null) params.finalizada = finalizada;
    if (estado) params.estado = estado;

    const { data } = await apiClient.get<{
      success: boolean;
      notification?: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: {
        cosechas: Cosecha[];
        meta: { count: number; next: string | null; previous: string | null };
      };
    }>('/huerta/cosechas/', { params });

    return data;
  },

  async create(payload: CosechaCreateData) {
    const { data } = await apiClient.post<{
      success: boolean;
      notification?: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { cosecha: Cosecha };
    }>('/huerta/cosechas/', payload);
    return data;
  },

  async update(id: number, payload: CosechaUpdateData) {
    const { data } = await apiClient.put<{
      success: boolean;
      notification?: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { cosecha: Cosecha };
    }>(`/huerta/cosechas/${id}/`, payload);
    return data;
  },

  async delete(id: number) {
    const { data } = await apiClient.delete<{
      success: boolean;
      notification?: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { info: string };
    }>(`/huerta/cosechas/${id}/`);
    return data;
  },

  async archivar(id: number) {
    const { data } = await apiClient.post<{
      success: boolean;
      notification?: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { cosecha: Cosecha };
    }>(`/huerta/cosechas/${id}/archivar/`);
    return data;
  },

  async restaurar(id: number) {
    const { data } = await apiClient.post<{
      success: boolean;
      notification?: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { cosecha: Cosecha };
    }>(`/huerta/cosechas/${id}/restaurar/`);
    return data;
  },

  async toggleFinalizada(id: number) {
    const { data } = await apiClient.post<{
      success: boolean;
      notification?: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { cosecha: Cosecha };
    }>(`/huerta/cosechas/${id}/toggle-finalizada/`);
    return data;
  },
};
