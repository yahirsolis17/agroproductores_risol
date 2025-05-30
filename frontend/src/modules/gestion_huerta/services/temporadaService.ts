// src/modules/gestion_huerta/services/temporadaService.ts

import apiClient from '../../../global/api/apiClient';
import {
  Temporada,
  TemporadaCreateData,
  TemporadaUpdateData,
} from '../types/temporadaTypes';

/**
 * Servicios REST para Temporadas.
 * Cada método retorna:
 *  - success: boolean
 *  - notification: { key, message, type }
 *  - data: objetos específicos (temporadas, temporada, info)
 */
export const temporadaService = {
  async list(page: number = 1, params: Record<string, any> = {}) {
    const response = await apiClient.get<{
      success: boolean;
      notification: {
        key: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
      };
      data: {
        temporadas: Temporada[];
        meta: { count: number; next: string | null; previous: string | null };
      };
    }>('/huerta/temporadas/', {
      params: { page, ...params },
    });
    return response.data;
  },

  async create(payload: TemporadaCreateData) {
    const response = await apiClient.post<{
      success: boolean;
      notification: {
        key: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
      };
      data: { temporada: Temporada };
    }>('/huerta/temporadas/', payload);
    return response.data;
  },

  async update(id: number, payload: TemporadaUpdateData) {
    const response = await apiClient.put<{
      success: boolean;
      notification: {
        key: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
      };
      data: { temporada: Temporada };
    }>(`/huerta/temporadas/${id}/`, payload);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete<{
      success: boolean;
      notification: {
        key: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
      };
      data: { info: string };
    }>(`/huerta/temporadas/${id}/`);
    return response.data;
  },

  async finalizar(id: number) {
    const response = await apiClient.post<{
      success: boolean;
      notification: {
        key: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
      };
      data: { temporada: Temporada };
    }>(`/huerta/temporadas/${id}/finalizar/`);
    return response.data;
  },

  async archivar(id: number) {
    const response = await apiClient.post<{
      success: boolean;
      notification: {
        key: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
      };
      data: { temporada: Temporada };
    }>(`/huerta/temporadas/${id}/archivar/`);
    return response.data;
  },

  async restaurar(id: number) {
    const response = await apiClient.post<{
      success: boolean;
      notification: {
        key: string;
        message: string;
        type: 'success' | 'error' | 'warning' | 'info';
      };
      data: { temporada: Temporada };
    }>(`/huerta/temporadas/${id}/restaurar/`);
    return response.data;
  },
};
