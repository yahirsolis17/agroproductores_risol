import apiClient from '../../../global/api/apiClient';
import {
  HuertaRentada,
  HuertaRentadaCreateData,
  HuertaRentadaUpdateData,
} from '../types/huertaRentadaTypes';

/** Estado para filtrar en servidor */
export type Estado = 'activos' | 'archivados' | 'todos';

/** Filtros aceptados por el endpoint de huertas rentadas */
export interface HRFilters {
  search?: string;
  nombre?: string;
  propietario?: number;
}

interface ListResp {
  huertas_rentadas: HuertaRentada[];
  meta: { count: number; next: string | null; previous: string | null };
}
interface ItemWrapper { huerta_rentada: HuertaRentada; }

/** CRUD completo para Huertas rentadas */
export const huertaRentadaService = {
  async list(
    page = 1,
    estado: Estado = 'activos',
    filters: HRFilters = {}
  ): Promise<ListResp> {
    const params: Record<string, any> = { page, estado };
    if (filters.search)      params.search     = filters.search;
    if (filters.nombre)      params.nombre     = filters.nombre;
    if (filters.propietario) params.propietario = filters.propietario;

    const { data } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: ListResp;
    }>('/huerta/huertas-rentadas/', { params });

    return data.data;
  },

  async create(payload: HuertaRentadaCreateData) {
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: ItemWrapper;
    }>(
      '/huerta/huertas-rentadas/',
      payload
    );
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
      data: { huerta_rentada_id: number };
    }>(`/huerta/huertas-rentadas/${id}/archivar/`);
    return data;
  },

  async restaurar(id: number) {
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: { huerta_rentada_id: number };
    }>(`/huerta/huertas-rentadas/${id}/restaurar/`);
    return data;
  },
};
