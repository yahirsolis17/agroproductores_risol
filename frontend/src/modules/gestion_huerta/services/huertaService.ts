import apiClient from '../../../global/api/apiClient';
import { Huerta, HuertaCreateData, HuertaUpdateData } from '../types/huertaTypes';
import { Estado, PaginationMeta, AffectedCounts } from '../types/shared';

export interface HuertaFilters {
  search?: string;
  nombre?: string;
  propietario?: number;
}

interface ListRespRaw {
  results?: Huerta[];
  huertas?: Huerta[];
  meta: PaginationMeta;
}

interface ItemWrapper { huerta: Huerta; }

export const huertaService = {
  async list(
    page = 1,
    estado: Estado = 'activos',
    filters: HuertaFilters = {},
    config: { signal?: AbortSignal; pageSize?: number } = {}
  ): Promise<{ huertas: Huerta[]; meta: PaginationMeta }> {
    const pageSize = config.pageSize ?? 10; // fuerza 10 para que coincida con la UI
    const params: Record<string, any> = { page, estado, page_size: pageSize };
    if (filters.search) params.search = filters.search;
    if (filters.nombre) params.nombre = filters.nombre;
    if (filters.propietario) params.propietario = filters.propietario;

    const { data } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: ListRespRaw;
    }>('/huerta/huertas/', { params, signal: config.signal });

    const raw = data.data;
    const list = raw.results ?? raw.huertas ?? [];
    return { huertas: list, meta: raw.meta };
  },

  async create(payload: HuertaCreateData) {
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: ItemWrapper;
    }>('/huerta/huertas/', payload);
    return data;
  },

  async update(id: number, payload: HuertaUpdateData) {
    const { data } = await apiClient.put<{
      success: boolean;
      message_key: string;
      data: ItemWrapper;
    }>(`/huerta/huertas/${id}/`, payload);
    return data;
  },

  async delete(id: number) {
    const { data } = await apiClient.delete<{
      success: boolean;
      message_key: string;
      data: { info: string };
    }>(`/huerta/huertas/${id}/`);
    return data;
  },

  async archivar(id: number) {
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: { huerta_id: number; affected?: AffectedCounts };
    }>(`/huerta/huertas/${id}/archivar/`);
    return data;
  },

  async restaurar(id: number) {
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: { huerta_id: number; affected?: AffectedCounts };
    }>(`/huerta/huertas/${id}/restaurar/`);
    return data;
  },

  getById(id: number): Promise<{ data: { huerta: Huerta } }> {
    return apiClient
      .get<Huerta>(`/huerta/huertas/${id}/`)
      .then(res => ({ data: { huerta: res.data } }));
  },
};
