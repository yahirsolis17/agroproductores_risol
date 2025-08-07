import apiClient from '../../../global/api/apiClient';
import { Inversion, InversionCreate, InversionUpdate } from '../types/inversionTypes';

export type Estado = 'activos' | 'archivados' | 'todos';

export interface InversionFilters {
  search?: string;
  categoria_id?: number;
  fecha_desde?: string; // YYYY-MM-DD
  fecha_hasta?: string; // YYYY-MM-DD
}

interface ListResp {
  inversiones: Inversion[];
  meta: { count: number; next: string | null; previous: string | null };
}
interface ItemWrapper { inversion: Inversion; }

export const inversionService = {
  async list(
    page = 1,
    estado: Estado = 'activos',
    cosechaId: number,
    filters: InversionFilters = {}
  ): Promise<ListResp> {
    const params: Record<string, any> = { page, estado, cosecha: cosechaId };
    if (filters.search)      params.search       = filters.search;
    if (filters.categoria_id) params.categoria_id = filters.categoria_id;
    if (filters.fecha_desde) params.fecha_desde   = filters.fecha_desde;
    if (filters.fecha_hasta) params.fecha_hasta   = filters.fecha_hasta;

    const { data } = await apiClient.get<{ success: boolean; message_key: string; data: ListResp }>(
      '/huerta/inversiones/',
      { params }
    );
    return data.data;
  },

  async create(payload: InversionCreate) {
    const { data } = await apiClient.post<{ success: boolean; message_key: string; data: ItemWrapper }>(
      '/huerta/inversiones/',
      payload
    );
    return data;
  },

  async update(id: number, payload: InversionUpdate) {
    const { data } = await apiClient.put<{ success: boolean; message_key: string; data: ItemWrapper }>(
      `/huerta/inversiones/${id}/`,
      payload
    );
    return data;
  },

  async delete(id: number) {
    const { data } = await apiClient.delete<{ success: boolean; message_key: string; data: { info: string } }>(
      `/huerta/inversiones/${id}/`
    );
    return data;
  },

  async archivar(id: number) {
    const { data } = await apiClient.post<{ success: boolean; message_key: string; data: { inversion_id: number } }>(
      `/huerta/inversiones/${id}/archivar/`
    );
    return data;
  },

  async restaurar(id: number) {
    const { data } = await apiClient.post<{ success: boolean; message_key: string; data: { inversion_id: number } }>(
      `/huerta/inversiones/${id}/restaurar/`
    );
    return data;
  },
};
