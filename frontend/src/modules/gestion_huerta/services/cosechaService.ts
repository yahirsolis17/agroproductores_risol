// src/modules/gestion_huerta/services/cosechaService.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from '../../../global/api/apiClient';
import { Cosecha, CosechaCreateData, CosechaUpdateData } from '../types/cosechaTypes';
import { ApiEnvelope, ListEnvelope, PaginationMeta } from '../types/shared';

type CosechaMeta = PaginationMeta & { total_registradas?: number };

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
    const { data } = await apiClient.get<ListEnvelope<Cosecha, CosechaMeta>>('/huerta/cosechas/', { params });
    return data;
  },

  // CREATE
  async create(payload: CosechaCreateData) {
    const response = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>('/huerta/cosechas/', payload);
    return response.data;
  },

  // UPDATE (PATCH parcial)
  async update(id: number, payload: CosechaUpdateData) {
    const response = await apiClient.patch<ApiEnvelope<{ cosecha: Cosecha }>>(
      `/huerta/cosechas/${id}/`,
      payload
    );
    return response.data;
  },

  // DELETE
  async delete(id: number) {
    const response = await apiClient.delete<ApiEnvelope<{ info: string }>>(`/huerta/cosechas/${id}/`);
    return response.data;
  },

  // ARCHIVAR
  async archivar(id: number) {
    const response = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
      `/huerta/cosechas/${id}/archivar/`
    );
    return response.data;
  },

  // RESTAURAR
  async restaurar(id: number) {
    const response = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
      `/huerta/cosechas/${id}/restaurar/`
    );
    return response.data;
  },

  // FINALIZAR
  async finalizar(id: number) {
    const response = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
      `/huerta/cosechas/${id}/finalizar/`
    );
    return response.data;
  },

  // TOGGLE FINALIZADA
  async toggleFinalizada(id: number) {
    const response = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
      `/huerta/cosechas/${id}/toggle-finalizada/`
    );
    return response.data;
  },

  // REACTIVAR (alias de deshacer finalización)
  async reactivar(id: number) {
    const response = await apiClient.post<ApiEnvelope<{ cosecha: Cosecha }>>(
      `/huerta/cosechas/${id}/reactivar/`
    );
    return response.data;
  },

  // GET BY ID (normalizado)
  getById: async (id: number): Promise<ApiEnvelope<{ cosecha: Cosecha }>> => {
    const { data } = await apiClient.get<ApiEnvelope<{ cosecha: Cosecha }>>(`/huerta/cosechas/${id}/`);
    return data;
  },

};
