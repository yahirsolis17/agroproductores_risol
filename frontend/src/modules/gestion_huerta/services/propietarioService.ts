import apiClient from '../../../global/api/apiClient';
import {
  Propietario,
  PropietarioCreateData,
  PropietarioUpdateData,
} from '../types/propietarioTypes';

/* ---------- Respuestas ---------- */
export interface PropietarioListResponse {
  propietarios: Propietario[];
  meta: { count: number; next: string | null; previous: string | null };
}

/* ---------- Service ---------- */
export const propietarioService = {
  /* LIST */
  async list(page = 1, estado: 'activos' | 'archivados' | 'todos') {
    const qp = new URLSearchParams({ page: String(page) });
    if (estado !== 'todos') qp.append('estado', estado);

    // wrapper = { success, message_key, data: { propietarios, meta } }
    const { data: wrapper } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: PropietarioListResponse;
    }>(`/huerta/propietarios/?${qp.toString()}`);

    return wrapper.data; // → { propietarios, meta }
  },

  /* CREATE */
  async create(payload: PropietarioCreateData) {
    // wrapper.data = { propietario }
    const { data: wrapper } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: { propietario: Propietario };
    }>('/huerta/propietarios/', payload);

    return wrapper; // devolvemos el wrapper completo
  },

  /* UPDATE */
  async update(id: number, payload: PropietarioUpdateData) {
    const { data: wrapper } = await apiClient.put<{
      success: boolean;
      message_key: string;
      data: { propietario: Propietario };
    }>(`/huerta/propietarios/${id}/`, payload);
    return wrapper;
  },

  /* DELETE */
  async delete(id: number) {
    const { data: wrapper } = await apiClient.delete<{
      success: boolean;
      message_key: string;
      data: { info: string };
    }>(`/huerta/propietarios/${id}/`);
    return wrapper;
  },

  /* ARCHIVAR / RESTAURAR */
  async archive(id: number) {
    const { data: wrapper } = await apiClient.patch<{
      success: boolean;
      message_key: string;
      data: { propietario: Propietario };
    }>(`/huerta/propietarios/${id}/archivar/`);
    return wrapper;
  },

  async restore(id: number) {
    const { data: wrapper } = await apiClient.patch<{
      success: boolean;
      message_key: string;
      data: { propietario: Propietario };
    }>(`/huerta/propietarios/${id}/restaurar/`);
    return wrapper;
  },
};
