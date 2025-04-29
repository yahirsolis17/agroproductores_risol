// src/modules/gestion_huerta/services/inversionService.ts
import apiClient from '../../../global/api/apiClient';
import {
  InversionHuerta,
  InversionCreateData,
  InversionUpdateData,
} from '../types/inversionTypes';

interface PaginatedInversionResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: InversionHuerta[];
}

export const inversionService = {
  async listByCosecha(cosechaId: number, page: number = 1) {
    // GET /huerta/inversiones/<cosecha_id>/?page=N
    const { data } = await apiClient.get<PaginatedInversionResponse>(
      `/huerta/inversiones/${cosechaId}/?page=${page}`
    );
    return data;
  },

  async create(payload: InversionCreateData) {
    // POST /huerta/inversion/create/
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: { inversion?: InversionHuerta };
    }>('/huerta/inversion/create/', payload);
    return data;
  },

  async update(id: number, payload: InversionUpdateData) {
    // PUT /huerta/inversion/<id>/update/
    const { data } = await apiClient.put<{
      success: boolean;
      message_key: string;
      data: { inversion?: InversionHuerta };
    }>(`/huerta/inversion/${id}/update/`, payload);
    return data;
  },

  async delete(id: number) {
    // DELETE /huerta/inversion/<id>/delete/
    const { data } = await apiClient.delete<{
      success: boolean;
      message_key: string;
      data: { info?: string };
    }>(`/huerta/inversion/${id}/delete/`);
    return data;
  },
};
