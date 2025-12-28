// src/modules/gestion_huerta/services/huertaService.ts
import apiClient from '../../../global/api/apiClient';
import { Huerta, HuertaCreateData, HuertaUpdateData } from '../types/huertaTypes';
import { Estado, AffectedCounts, ApiEnvelope, ListEnvelope } from '../types/shared';

export interface HuertaFilters {
  search?: string;
  nombre?: string;
  propietario?: number;
}

export const huertaService = {
  async list(
    page = 1,
    estado: Estado = 'activos',
    filters: HuertaFilters = {},
    config: { signal?: AbortSignal; pageSize?: number } = {}
  ): Promise<ListEnvelope<Huerta>> {
    const pageSize = config.pageSize ?? 10; // fuerza 10 para que coincida con la UI
    const params: Record<string, any> = { page, estado, page_size: pageSize };
    if (filters.search) params.search = filters.search;
    if (filters.nombre) params.nombre = filters.nombre;
    if (filters.propietario) params.propietario = filters.propietario;

    const { data } = await apiClient.get<ListEnvelope<Huerta>>('/huerta/huertas/', {
      params,
      signal: config.signal,
    });
    return data;
  },

  async create(payload: HuertaCreateData) {
    const { data } = await apiClient.post<ApiEnvelope<{ huerta: Huerta }>>('/huerta/huertas/', payload);
    return data;
  },

  async update(id: number, payload: HuertaUpdateData) {
    const { data } = await apiClient.put<ApiEnvelope<{ huerta: Huerta }>>(
      `/huerta/huertas/${id}/`,
      payload
    );
    return data;
  },

  async delete(id: number) {
    const { data } = await apiClient.delete<ApiEnvelope<{ info: string }>>(`/huerta/huertas/${id}/`);
    return data;
  },

  async archivar(id: number) {
    const { data } = await apiClient.post<ApiEnvelope<{ huerta_id: number; affected?: AffectedCounts }>>(
      `/huerta/huertas/${id}/archivar/`
    );
    return data;
  },

  async restaurar(id: number) {
    const { data } = await apiClient.post<ApiEnvelope<{ huerta_id: number; affected?: AffectedCounts }>>(
      `/huerta/huertas/${id}/restaurar/`
    );
    return data;
  },

  // 👇 NUEVO: obtener 1 huerta por ID para pintar encabezados/breadcrumbs
  async getById(id: number): Promise<ApiEnvelope<{ huerta: Huerta }>> {
    const { data } = await apiClient.get<ApiEnvelope<{ huerta: Huerta }>>(`/huerta/huertas/${id}/`);
    return data;
  },
};
