import apiClient from '../../../global/api/apiClient';
import {
  HuertaRentada,
  HuertaRentadaCreateData,
  HuertaRentadaUpdateData,
} from '../types/huertaRentadaTypes';

interface HuertaRentadaListData {
  huertas_rentadas: HuertaRentada[];
}

interface HuertaRentadaCreateUpdateDeleteResponse {
  huerta_rentada?: HuertaRentada;
  info?: string;
}

export const huertaRentadaService = {
  async list() {
    const { data } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: HuertaRentadaListData;
    }>('/api/huertas_rentadas/');
    return data;
  },

  async create(payload: HuertaRentadaCreateData) {
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: HuertaRentadaCreateUpdateDeleteResponse;
    }>('/api/huerta_rentada/create/', payload);
    return data;
  },

  async update(id: number, payload: HuertaRentadaUpdateData) {
    const { data } = await apiClient.put<{
      success: boolean;
      message_key: string;
      data: HuertaRentadaCreateUpdateDeleteResponse;
    }>(`/api/huerta_rentada/update/${id}/`, payload);
    return data;
  },

  async delete(id: number) {
    const { data } = await apiClient.delete<{
      success: boolean;
      message_key: string;
      data: HuertaRentadaCreateUpdateDeleteResponse;
    }>(`/api/huerta_rentada/delete/${id}/`);
    return data;
  },
};
