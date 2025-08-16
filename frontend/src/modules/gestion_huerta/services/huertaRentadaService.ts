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
    const pageSize = config.pageSize ?? 10; // por consistencia
    const params: Record<string, any> = { page, estado, page_size: pageSize };
    if (filters.search) params.search = filters.search;
    if (filters.nombre) params.nombre = filters.nombre;
    if (filters.propietario) params.propietario = filters.propietario;

    const { data } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: ListRespRaw;
    }>('/huerta/huertas-rentadas/', { params, signal: config.signal });

    const raw = data.data;
    const list = raw.results ?? raw.huertas_rentadas ?? [];
    return { huertas_rentadas: list, meta: raw.meta };
  },

  async create(payload: HuertaRentadaCreateData) {
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: ItemWrapper;
    }>('/huerta/huertas-rentadas/', payload);
    return data;
  },

  async update(id: number, payload: HuertaRentadaUpdateData) {
    const { data } = await apiClient.put<{
      success: boolean;
      message_key: string;
      data: ItemWrapper;
    }>(`/huerta/huertas-rentadas/${id}/`, payload);
    return data;
  },

  async delete(id: number) {
    const { data } = await apiClient.delete<{
      success: boolean;
      message_key: string;
      data: { info: string };
    }>(`/huerta/huertas-rentadas/${id}/`);
    return data;
  },

  async archivar(id: number) {
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: { huerta_rentada_id: number; affected?: AffectedCounts };
    }>(`/huerta/huertas-rentadas/${id}/archivar/`);
    return data;
  },

  async restaurar(id: number) {
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: { huerta_rentada_id: number; affected?: AffectedCounts };
    }>(`/huerta/huertas-rentadas/${id}/restaurar/`);
    return data;
  },

  getById(id: number): Promise<{ data: { huerta_rentada: HuertaRentada } }> {
    return apiClient
      .get<HuertaRentada>(`/huerta/huertas-rentadas/${id}/`)
      .then(res => ({ data: { huerta_rentada: res.data } }));
  },
};
