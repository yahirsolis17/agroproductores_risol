// src/modules/gestion_huerta/services/propietarioService.ts
import apiClient from '../../../global/api/apiClient';
import {
  Propietario,
  PropietarioCreateData,
  PropietarioUpdateData,
} from '../types/propietarioTypes';

interface PropietarioListResponse {
  propietarios: Propietario[];
  count: number;
  next: string | null;
  previous: string | null;
}

export const propietarioService = {
  /* ---------------- LISTADO ---------------- */
  async list(page = 1) {
    const { data } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: PropietarioListResponse;
    }>(`/huerta/propietarios/?page=${page}`);
    return data;
  },

  /* ---------------- CREAR ---------------- */
  async create(payload: PropietarioCreateData) {
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: { propietario: Propietario };
    }>('/huerta/propietarios/', payload);
    return data;
  },

  /* ---------------- ACTUALIZAR ---------------- */
  async update(id: number, payload: PropietarioUpdateData) {
    const { data } = await apiClient.put<{
      success: boolean;
      message_key: string;
      data: { propietario: Propietario };
    }>(`/huerta/propietarios/${id}/`, payload);
    return data;
  },

  /* ---------------- ELIMINAR ---------------- */
  async delete(id: number) {
    const { data } = await apiClient.delete<{
      success: boolean;
      message_key: string;
      data: { info: string };
    }>(`/huerta/propietarios/${id}/`);
    return data;
  },

  /* ------------- ARCHIVAR / RESTAURAR ------------- */
  async archive(id: number) {
    const { data } = await apiClient.patch<{
      success: boolean;
      message_key: string;
      data: { propietario: Propietario };
    }>(`/huerta/propietarios/${id}/archivar/`);
    return data;
  },

  async restore(id: number) {
    const { data } = await apiClient.patch<{
      success: boolean;
      message_key: string;
      data: { propietario: Propietario };
    }>(`/huerta/propietarios/${id}/restaurar/`);
    return data;
  },
};
