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
  async list(page = 1) {
    const { data } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: PropietarioListResponse;
    }>(`/huerta/propietarios/?page=${page}`);
    return data;
  },

  async create(payload: PropietarioCreateData) {
    // Llamada a POST /huerta/propietarios/
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: { propietario: Propietario };
    }>('/huerta/propietarios/', payload);
    return data;
  },

  async update(id: number, payload: PropietarioUpdateData) {
    // PUT /huerta/propietarios/{id}/
    const { data } = await apiClient.put<{
      success: boolean;
      message_key: string;
      data: { propietario: Propietario };
    }>(`/huerta/propietarios/${id}/`, payload);
    return data;
  },

  async delete(id: number) {
    // DELETE /huerta/propietarios/{id}/
    const { data } = await apiClient.delete<{
      success: boolean;
      message_key: string;
      data: { info: string };
    }>(`/huerta/propietarios/${id}/`);
    return data;
  },
};
