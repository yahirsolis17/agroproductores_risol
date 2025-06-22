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
// estadoToQuery debe usar SOLO 'archivado'
const estadoToQuery = (estado: 'activos'|'archivados'|'todos') =>
  estado === 'todos' ? undefined : (estado === 'activos' ? 'false' : 'true');
/* -------------------------------------------------------------------------- */
/*  API                                                                      */
/* -------------------------------------------------------------------------- */
export const propietarioService = {
  /* ------------ LIST ------------ */
  async list(
    page = 1,
    estado: 'activos' | 'archivados' | 'todos',
    filters: Record<string, any> = {}
  ) {
    console.log("[Service] list ejecutado. page, estado, filters:", { page, estado, filters });
    const params: Record<string, any> = { page };
    const arch = estadoToQuery(estado);
    if (arch !== undefined) params.archivado = arch;
    Object.keys(filters).forEach(key => {
      params[key] = filters[key];
    });
    console.log("[Service] list params finales:", params);
    const { data } = await apiClient.get<{
      success: boolean; message_key: string; data: ListResp;
    }>('/huerta/propietarios/', { params });
    console.log('[Service] Respuesta LIST:', data);
    return data.data;
  },
  /* ------------ CREATE ------------ */
  async create(payload: PropietarioCreateData) {
    console.log('[Service] Payload CREATE:', payload);
    const { data } = await apiClient.post<{
      success: boolean; message_key: string; data: ItemWrapper;
    }>('/huerta/propietarios/', payload);
    console.log('[Service] Respuesta CREATE:', data);
    return data;
  },
  /* ------------ UPDATE ------------ */
  async update(id: number, payload: PropietarioUpdateData) {
    console.log('[Service] Payload UPDATE:', { id, payload });
    const { data } = await apiClient.put<{
      success: boolean; message_key: string; data: ItemWrapper;
    }>(`/huerta/propietarios/${id}/`, payload);
    console.log('[Service] Respuesta UPDATE:', data);
    return data;
  },
  /* ------------ DELETE ------------ */
  async delete(id: number) {
    console.log('[Service] Payload DELETE:', id);
    const { data } = await apiClient.delete<{
      success: boolean; message_key: string; data: { info: string };
    }>(`/huerta/propietarios/${id}/`);
    console.log('[Service] Respuesta DELETE:', data);
    return data;
  },
  /* ------------ ARCHIVAR / RESTAURAR ------------ */
  async archive(id: number) {
    console.log('[Service] Payload ARCHIVE:', id);
    const { data } = await apiClient.patch<{
      success: boolean; message_key: string; data: ItemWrapper;
    }>(`/huerta/propietarios/${id}/archivar/`);
    console.log('[Service] Respuesta ARCHIVE:', data);
    return data;
  },
  async restore(id: number) {
    console.log('[Service] Payload RESTORE:', id);
    const { data } = await apiClient.patch<{
      success: boolean; message_key: string; data: ItemWrapper;
    }>(`/huerta/propietarios/${id}/restaurar/`);
    console.log('[Service] Respuesta RESTORE:', data);
    return data;
  },
};
