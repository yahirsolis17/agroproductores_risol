// src/modules/gestion_huerta/services/huertaRentadaService.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from '../../../global/api/apiClient';
import { HuertaRentada, HuertaRentadaCreateData, HuertaRentadaUpdateData } from '../types/huertaRentadaTypes';
import { Estado, PaginationMeta, AffectedCounts } from '../types/shared';

export interface HRFilters {
  search?: string;
  nombre?: string;
  propietario?: number;
}

interface ListRespRaw {
  results?: HuertaRentada[];
  huertas_rentadas?: HuertaRentada[];
  meta: PaginationMeta;
}

interface ItemWrapper { huerta_rentada: HuertaRentada; }

export const huertaRentadaService = {
  async list(
    page = 1,
    estado: Estado = 'activos',
    filters: HRFilters = {},
    config: { signal?: AbortSignal; pageSize?: number } = {}
  ): Promise<{ huertas_rentadas: HuertaRentada[]; meta: PaginationMeta }> {
    const pageSize = config.pageSize ?? 10;
    const params: Record<string, any> = { page, estado, page_size: pageSize };
    if (filters.search) params.search = filters.search;
    if (filters.nombre) params.nombre = filters.nombre;
    if (filters.propietario) params.propietario = filters.propietario;

    const { data } = await apiClient.get<{
      success: boolean;
      notification: any;              // 👈
      data: ListRespRaw;
    }>('/huerta/huertas-rentadas/', { params, signal: config.signal });

    const raw = data.data;
    const list = raw.results ?? raw.huertas_rentadas ?? [];
    return { huertas_rentadas: list, meta: raw.meta };
  },

  async create(payload: HuertaRentadaCreateData) {
    const { data } = await apiClient.post<{
      success: boolean;
      notification: any;              // 👈
      data: ItemWrapper;
    }>('/huerta/huertas-rentadas/', payload);
    return data;
  },

  async update(id: number, payload: HuertaRentadaUpdateData) {
    const { data } = await apiClient.put<{
      success: boolean;
      notification: any;              // 👈
      data: ItemWrapper;
    }>(`/huerta/huertas-rentadas/${id}/`, payload);
    return data;
  },

  async delete(id: number) {
    const { data } = await apiClient.delete<{
      success: boolean;
      notification: any;              // 👈
      data: { info: string };
    }>(`/huerta/huertas-rentadas/${id}/`);
    return data;
  },

  async archivar(id: number) {
    const { data } = await apiClient.post<{
      success: boolean;
      notification: any;              // 👈
      data: { huerta_rentada_id: number; affected?: AffectedCounts };
    }>(`/huerta/huertas-rentadas/${id}/archivar/`);
    return data;
  },

  async restaurar(id: number) {
    const { data } = await apiClient.post<{
      success: boolean;
      notification: any;              // 👈
      data: { huerta_rentada_id: number; affected?: AffectedCounts };
    }>(`/huerta/huertas-rentadas/${id}/archivar/`);
    return data;
  },

  // 👇 NUEVO: obtener 1 huerta rentada por ID
  async getById(id: number): Promise<HuertaRentada> {
    const { data } = await apiClient.get<HuertaRentada>(`/huerta/huertas-rentadas/${id}/`);
    return data;
  },
};
