// src/modules/gestion_huerta/services/temporadaService.ts

import apiClient from '../../../global/api/apiClient';
import {
  Temporada,
  TemporadaCreateData,
} from '../types/temporadaTypes';

export const temporadaService = {
  async list(page: number = 1) {
    const response = await apiClient.get<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: {
        temporadas: Temporada[];
        meta: { count: number; next: string | null; previous: string | null };
      };
    }>('/huerta/temporadas/', {
      params: { page },
    });
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

  async reactivate(id: number) {
    const response = await apiClient.post<{
      success: boolean;
      notification: { key: string; message: string; type: 'success'|'error'|'warning'|'info' };
      data: { temporada: Temporada };
    }>(`/huerta/temporadas/${id}/reactivar/`);
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
};
