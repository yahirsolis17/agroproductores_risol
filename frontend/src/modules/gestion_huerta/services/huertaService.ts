import apiClient from '../../../global/api/apiClient';
import {
  Huerta,
  HuertaCreateData,
  HuertaUpdateData,
} from '../types/huertaTypes';

interface HuertaListData {
  huertas: Huerta[];
  meta: {
    count: number;
    next: string | null;
    previous: string | null;
  };
}

interface HuertaCreateUpdateDeleteResponse {
  huerta?: Huerta;
  info?: string;
}

export const huertaService = {
  async list(page = 1) {
    // GET a /huerta/huertas/ (list + pagination)
    const { data } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: HuertaListData;
    }>(`/huerta/huertas/?page=${page}`);
    return data;
  },

  async create(payload: HuertaCreateData) {
    // POST a /huerta/huertas/ (creación)
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: HuertaCreateUpdateDeleteResponse;
    }>('/huerta/huertas/', payload);
    return data;
  },

  async update(id: number, payload: HuertaUpdateData) {
    // PUT a /huerta/huertas/{id}/ (update)
    const { data } = await apiClient.put<{
      success: boolean;
      message_key: string;
      data: HuertaCreateUpdateDeleteResponse;
    }>(`/huerta/huertas/${id}/`, payload);
    return data;
  },

  async delete(id: number) {
    // DELETE a /huerta/huertas/{id}/
    const { data } = await apiClient.delete<{
      success: boolean;
      message_key: string;
      data: HuertaCreateUpdateDeleteResponse;
    }>(`/huerta/huertas/${id}/`);
    return data;
  },
};
