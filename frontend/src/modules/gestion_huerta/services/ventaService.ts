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
    // GET /huerta/ventas/<cosecha_id>/?page=N
    const { data } = await apiClient.get<PaginatedVentaResponse>(
      `/huerta/ventas/${cosechaId}/?page=${page}`
    );
    return data;
  },

  async create(payload: VentaCreateData) {
    // POST /huerta/venta/create/
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: { venta?: Venta };
    }>('/huerta/venta/create/', payload);
    return data;
  },

  async update(id: number, payload: VentaUpdateData) {
    // PUT /huerta/venta/<id>/update/
    const { data } = await apiClient.put<{
      success: boolean;
      message_key: string;
      data: { venta?: Venta };
    }>(`/huerta/venta/${id}/update/`, payload);
    return data;
  },

  async delete(id: number) {
    // DELETE /huerta/venta/<id>/delete/
    const { data } = await apiClient.delete<{
      success: boolean;
      message_key: string;
      data: { info?: string };
    }>(`/huerta/venta/${id}/delete/`);
    return data;
  },
};
