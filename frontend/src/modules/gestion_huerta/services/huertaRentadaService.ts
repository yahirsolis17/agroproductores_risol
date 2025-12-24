// src/modules/gestion_huerta/services/huertaRentadaService.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from '../../../global/api/apiClient';
import { HuertaRentada, HuertaRentadaCreateData, HuertaRentadaUpdateData } from '../types/huertaRentadaTypes';
import { Estado, AffectedCounts, ApiEnvelope, ListEnvelope } from '../types/shared';

export interface HRFilters {
  search?: string;
  nombre?: string;
  propietario?: number;
}

export const huertaRentadaService = {
  async list(
    page = 1,
    estado: Estado = 'activos',
    filters: HRFilters = {},
    config: { signal?: AbortSignal; pageSize?: number } = {}
  ): Promise<ListEnvelope<HuertaRentada>> {
    const pageSize = config.pageSize ?? 10;
    const params: Record<string, any> = { page, estado, page_size: pageSize };
    if (filters.search) params.search = filters.search;
    if (filters.nombre) params.nombre = filters.nombre;
    if (filters.propietario) params.propietario = filters.propietario;

    const { data } = await apiClient.get<ListEnvelope<HuertaRentada>>('/huerta/huertas-rentadas/', {
      params,
      signal: config.signal,
    });
    return data;
  },

  async create(payload: HuertaRentadaCreateData) {
    const { data } = await apiClient.post<ApiEnvelope<{ huerta_rentada: HuertaRentada }>>(
      '/huerta/huertas-rentadas/',
      payload
    );
    return data;
  },

  async update(id: number, payload: HuertaRentadaUpdateData) {
    const { data } = await apiClient.put<ApiEnvelope<{ huerta_rentada: HuertaRentada }>>(
      `/huerta/huertas-rentadas/${id}/`,
      payload
    );
    return data;
  },

  async delete(id: number) {
    const { data } = await apiClient.delete<ApiEnvelope<{ info: string }>>(
      `/huerta/huertas-rentadas/${id}/`
    );
    return data;
  },

  async archivar(id: number) {
    const { data } = await apiClient.post<ApiEnvelope<{ huerta_rentada_id: number; affected?: AffectedCounts }>>(
      `/huerta/huertas-rentadas/${id}/archivar/`
    );
    return data;
  },

  async restaurar(id: number) {
    const { data } = await apiClient.post<ApiEnvelope<{ huerta_rentada_id: number; affected?: AffectedCounts }>>(
      `/huerta/huertas-rentadas/${id}/restaurar/`
    );
    return data;
  },

  // 👇 NUEVO: obtener 1 huerta rentada por ID
  async getById(id: number): Promise<ApiEnvelope<{ huerta_rentada: HuertaRentada }>> {
    const { data } = await apiClient.get<ApiEnvelope<{ huerta_rentada: HuertaRentada }>>(
      `/huerta/huertas-rentadas/${id}/`
    );
    return data;
  },
};
