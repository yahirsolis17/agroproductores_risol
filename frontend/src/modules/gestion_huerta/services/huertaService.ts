import apiClient from '../../../global/api/apiClient';
import {
  Huerta,
  HuertaCreateData,
  HuertaUpdateData,
} from '../types/huertaTypes';

/** Estado para filtrar en servidor */
export type Estado = 'activos' | 'archivados' | 'todos';

/** Filtros aceptados por el endpoint de huertas propias */
export interface HuertaFilters {
  /** Búsqueda global sobre nombre, ubicación, variedades */
  search?: string;
  /** Filtro específico por nombre */
  nombre?: string;
  /** Filtro específico por propietario (ID) */
  propietario?: number;
}

interface ListResp {
  huertas: Huerta[];
  meta: { count: number; next: string | null; previous: string | null };
}
interface ItemWrapper { huerta: Huerta; }

/** CRUD completo para Huertas propias */
export const huertaService = {
  /** Listar huertas (pag; estado; filtros opcionales) */
  async list(
    page = 1,
    estado: Estado = 'activos',
    filters: HuertaFilters = {}
  ): Promise<ListResp> {
    const params: Record<string, any> = { page, estado };
    if (filters.search)      params.search     = filters.search;
    if (filters.nombre)      params.nombre     = filters.nombre;
    if (filters.propietario) params.propietario = filters.propietario;

    const { data } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: ListResp;
    }>('/huerta/huertas/', { params });

    return data.data;
  },

  /** Crear una nueva huerta */
  async create(payload: HuertaCreateData) {
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: ItemWrapper;
    }>('/huerta/huertas/', payload);
    return data;
  },

  /** Actualizar huerta existente */
  async update(id: number, payload: HuertaUpdateData) {
    const { data } = await apiClient.put<{
      success: boolean;
      message_key: string;
      data: ItemWrapper;
    }>(`/huerta/huertas/${id}/`, payload);
    return data;
  },

  /** Eliminar huerta (solo si está archivada) */
  async delete(id: number) {
    const { data } = await apiClient.delete<{
      success: boolean;
      message_key: string;
      data: { info: string };
    }>(`/huerta/huertas/${id}/`);
    return data;
  },

  /** Archivar huerta */
  async archivar(id: number) {
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: { huerta_id: number };
    }>(`/huerta/huertas/${id}/archivar/`);
    return data;
  },

  /** Restaurar huerta archivada */
  async restaurar(id: number) {
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: { huerta_id: number };
    }>(`/huerta/huertas/${id}/restaurar/`);
    return data;
  },
};
