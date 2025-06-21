/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from '../../../global/api/apiClient';
import {
  Propietario,
  PropietarioCreateData,
  PropietarioUpdateData,
} from '../types/propietarioTypes';

/* -------------------------------------------------------------------------- */
/*  Interfaces de respuesta                                                   */
/* -------------------------------------------------------------------------- */
interface ListResp {
  propietarios: Propietario[];
  meta: { count: number; next: string | null; previous: string | null };
}

interface ItemWrapper { propietario: Propietario }

/* -------------------------------------------------------------------------- */
/*  Helper → traduce estado ☞ query param “archivado”                         */
/* -------------------------------------------------------------------------- */
const estadoToQuery = (estado: 'activos'|'archivados'|'todos') =>
  estado === 'todos' ? undefined : (estado === 'activos' ? 'false' : 'true');

/* -------------------------------------------------------------------------- */
/*  API                                                                      */
/* -------------------------------------------------------------------------- */
export const propietarioService = {
  /* ------------ LIST ------------ */
  async list(
    page = 1,
    estado: 'activos' | 'archivados' | 'todos' = 'activos',
    filters: { search?: string } = {}
  ) {
    const params: Record<string, any> = { page };
    const arch = estadoToQuery(estado);
    if (arch !== undefined) params.archivado = arch;

    if (filters.search) params.search = filters.search;

    const { data } = await apiClient.get<{
      success: boolean; message_key: string; data: ListResp;
    }>('/huerta/propietarios/', { params });

    return data.data;
  },


  /* ------------ CREATE ------------ */
  async create(payload: PropietarioCreateData) {
    const { data } = await apiClient.post<{
      success: boolean; message_key: string; data: ItemWrapper;
    }>('/huerta/propietarios/', payload);
    return data;
  },

  /* ------------ UPDATE ------------ */
  async update(id: number, payload: PropietarioUpdateData) {
    const { data } = await apiClient.put<{
      success: boolean; message_key: string; data: ItemWrapper;
    }>(`/huerta/propietarios/${id}/`, payload);
    return data;
  },

  /* ------------ DELETE ------------ */
  async delete(id: number) {
    const { data } = await apiClient.delete<{
      success: boolean; message_key: string; data: { info: string };
    }>(`/huerta/propietarios/${id}/`);
    return data;
  },

  /* ------------ ARCHIVAR / RESTAURAR ------------ */
  async archive(id: number) {
    const { data } = await apiClient.patch<{
      success: boolean; message_key: string; data: ItemWrapper;
    }>(`/huerta/propietarios/${id}/archivar/`);
    return data;
  },

  async restore(id: number) {
    const { data } = await apiClient.patch<{
      success: boolean; message_key: string; data: ItemWrapper;
    }>(`/huerta/propietarios/${id}/restaurar/`);
    return data;
  },
};
