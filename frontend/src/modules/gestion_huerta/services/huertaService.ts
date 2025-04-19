// src/modules/gestion_huerta/services/huertaService.ts
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
    const { data } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: HuertaListData;
    }>(`/huerta/huertas/?page=${page}`);
    return data;
  },

  async create(payload: HuertaCreateData) {
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: HuertaCreateUpdateDeleteResponse;
    }>('/huerta/huerta/create/', payload);
    return data;
  },

  async update(id: number, payload: HuertaUpdateData) {
    const { data } = await apiClient.put<{
      success: boolean;
      message_key: string;
      data: HuertaCreateUpdateDeleteResponse;
    }>(`/huerta/huerta/update/${id}/`, payload);
    return data;
  },

  async delete(id: number) {
    const { data } = await apiClient.delete<{
      success: boolean;
      message_key: string;
      data: HuertaCreateUpdateDeleteResponse;
    }>(`/huerta/huerta/delete/${id}/`);
    return data;
  },
};
