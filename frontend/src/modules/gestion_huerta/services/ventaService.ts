// src/modules/gestion_huerta/services/ventaService.ts
import apiClient from '../../../global/api/apiClient';
import {
  Venta,
  VentaCreateData,
  VentaUpdateData,
} from '../types/ventaTypes';

interface PaginatedVentaResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Venta[];
}

export const ventaService = {
  async listByCosecha(cosechaId: number, page: number = 1) {
    // GET /api/ventas/<cosecha_id>/?page=N
    const { data } = await apiClient.get<PaginatedVentaResponse>(`/api/ventas/${cosechaId}/?page=${page}`);
    return data;
  },

  async create(payload: VentaCreateData) {
    // POST /api/venta/create/
    const { data } = await apiClient.post('/api/venta/create/', payload);
    return data; // => { success, message_key, data: { venta: {...} } }
  },

  async update(id: number, payload: VentaUpdateData) {
    // PUT /api/venta/<id>/update/
    const { data } = await apiClient.put(`/api/venta/${id}/update/`, payload);
    return data;
  },

  async delete(id: number) {
    // DELETE /api/venta/<id>/delete/
    const { data } = await apiClient.delete(`/api/venta/${id}/delete/`);
    return data;
  },
};
