import apiClient from '../../../global/api/apiClient';
import { Venta, VentaCreate, VentaUpdate } from '../types/ventaTypes';

export type Estado = 'activos' | 'archivados' | 'todos';

export interface VentaFilters {
  search?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  tipo_mango?: string;
}

interface ListResp {
  ventas: Venta[];
  meta: { count: number; next: string | null; previous: string | null };
}
interface ItemWrapper { venta: Venta; }

export const ventaService = {
  async list(
    page = 1,
    estado: Estado = 'activos',
    cosechaId: number,
    filters: VentaFilters = {}
  ): Promise<ListResp> {
    const params: Record<string, any> = { page, estado, cosecha: cosechaId };
    if (filters.search)       params.search       = filters.search;
    if (filters.fecha_desde)  params.fecha_desde  = filters.fecha_desde;
    if (filters.fecha_hasta)  params.fecha_hasta  = filters.fecha_hasta;
    if (filters.tipo_mango)   params.tipo_mango   = filters.tipo_mango;

    const { data } = await apiClient.get<{ success: boolean; message_key: string; data: ListResp }>(
      '/huerta/ventas/',
      { params }
    );
    return data.data;
  },

  async create(payload: VentaCreate) {
    const { data } = await apiClient.post<{ success: boolean; message_key: string; data: ItemWrapper }>(
      '/huerta/ventas/',
      payload
    );
    return data;
  },

  async update(id: number, payload: VentaUpdate) {
    const { data } = await apiClient.put<{ success: boolean; message_key: string; data: ItemWrapper }>(
      `/huerta/ventas/${id}/`,
      payload
    );
    return data;
  },

  async delete(id: number) {
    const { data } = await apiClient.delete<{ success: boolean; message_key: string; data: { info: string } }>(
      `/huerta/ventas/${id}/`
    );
    return data;
  },

  async archivar(id: number) {
    const { data } = await apiClient.post<{ success: boolean; message_key: string; data: { venta_id: number } }>(
      `/huerta/ventas/${id}/archivar/`
    );
    return data;
  },

  async restaurar(id: number) {
    const { data } = await apiClient.post<{ success: boolean; message_key: string; data: { venta_id: number } }>(
      `/huerta/ventas/${id}/restaurar/`
    );
    return data;
  },
};
