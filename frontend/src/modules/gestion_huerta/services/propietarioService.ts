import apiClient from '../../../global/api/apiClient';
import {
  Propietario,
  PropietarioCreateData,
  PropietarioUpdateData,
} from '../types/propietarioTypes';

interface PropietarioListResponse {
  propietarios: Propietario[];
}

export const propietarioService = {
  async list() {
    const { data } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: PropietarioListResponse;
    }>('/huerta/propietarios/');
    return data;
  },

  async create(payload: PropietarioCreateData) {
    const { data } = await apiClient.post('/huerta/propietario/create/', payload);
    return data;
  },

  async update(id: number, payload: PropietarioUpdateData) {
    const { data } = await apiClient.put(`/huerta/propietario/update/${id}/`, payload);
    return data;
  },

  async delete(id: number) {
    const { data } = await apiClient.delete(`/huerta/propietario/delete/${id}/`);
    return data;
  },
};
