// src/modules/gestion_huerta/services/inversionService.ts
import apiClient from '../../../global/api/apiClient';
import {
  InversionHuerta,
  InversionCreateData,
  InversionUpdateData,
} from '../types/inversionTypes';

// DRF pagination structure
interface PaginatedInversionResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: InversionHuerta[];
}

export const inversionService = {
  async listByCosecha(cosechaId: number, page: number = 1) {
    // GET /api/inversiones/<cosecha_id>/?page=N
    const { data } = await apiClient.get<PaginatedInversionResponse>(
      `/api/inversiones/${cosechaId}/?page=${page}`
    );
    return data;
  },

  async create(payload: InversionCreateData) {
    // POST /api/inversion/create/
    const { data } = await apiClient.post('/api/inversion/create/', payload);
    return data; // => { success, message_key, data: { inversion: {...} } }
  },

  async update(id: number, payload: InversionUpdateData) {
    // PUT /api/inversion/<id>/update/
    const { data } = await apiClient.put(`/api/inversion/${id}/update/`, payload);
    return data;
  },

  async delete(id: number) {
    // DELETE /api/inversion/<id>/delete/
    const { data } = await apiClient.delete(`/api/inversion/${id}/delete/`);
    return data;
  },
};
