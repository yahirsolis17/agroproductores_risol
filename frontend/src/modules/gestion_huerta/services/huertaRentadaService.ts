// src/modules/gestion_huerta/services/huertaRentadaService.ts
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
    // GET /huerta/huertas_rentadas/
    const { data } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: HuertaRentadaListData;
    }>('/huerta/huertas_rentadas/');
    return data;
  },

  async create(payload: HuertaRentadaCreateData) {
    // POST /huerta/huerta_rentada/create/
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: HuertaRentadaCreateUpdateDeleteResponse;
    }>('/huerta/huerta_rentada/create/', payload);
    return data;
  },

  async update(id: number, payload: HuertaRentadaUpdateData) {
    // PUT /huerta/huerta_rentada/update/<id>/
    const { data } = await apiClient.put<{
      success: boolean;
      message_key: string;
      data: HuertaRentadaCreateUpdateDeleteResponse;
    }>(`/huerta/huerta_rentada/update/${id}/`, payload);
    return data;
  },

  async delete(id: number) {
    // DELETE /huerta/huerta_rentada/delete/<id>/
    const { data } = await apiClient.delete<{
      success: boolean;
      message_key: string;
      data: HuertaRentadaCreateUpdateDeleteResponse;
    }>(`/huerta/huerta_rentada/delete/${id}/`);
    return data;
  },
};
