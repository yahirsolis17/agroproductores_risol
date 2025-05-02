// src/modules/gestion_huerta/services/huertaRentadaService.ts
import apiClient from '../../../global/api/apiClient';
import {
  HuertaRentada,
  HuertaRentadaCreateData,
  HuertaRentadaUpdateData,
} from '../types/huertaRentadaTypes';

/* ══════════════════════════════════════════════════════════════
   Interfaces de respuesta alineadas con huertaService.ts
   ══════════════════════════════════════════════════════════════ */
interface HuertaRentadaListResponse {
  huertas_rentadas: HuertaRentada[];
  meta: {
    count: number;
    next: string | null;
    previous: string | null;
  };
}

interface HuertaRentadaPayload {
  huerta_rentada?: HuertaRentada;
  info?: string;
}

export const huertaRentadaService = {
  /* ---------------------- LIST ---------------------- */
  async list(page = 1, params: Record<string, any> = {}) {
    const { data } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: HuertaRentadaListResponse;
    }>('/huerta/huertas-rentadas/', {
      params: { page, ...params },
    });

    return data;
  },

  /* ---------------------- CREATE ---------------------- */
  async create(payload: HuertaRentadaCreateData) {
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: HuertaRentadaPayload;
    }>('/huerta/huertas-rentadas/', payload);

    return data;
  },

  /* ---------------------- UPDATE ---------------------- */
  async update(id: number, payload: HuertaRentadaUpdateData) {
    const { data } = await apiClient.put<{
      success: boolean;
      message_key: string;
      data: HuertaRentadaPayload;
    }>(`/huerta/huertas-rentadas/${id}/`, payload);

    return data;
  },

  /* ---------------------- DELETE ---------------------- */
  async delete(id: number) {
    const { data } = await apiClient.delete<{
      success: boolean;
      message_key: string;
      data: HuertaRentadaPayload;
    }>(`/huerta/huertas-rentadas/${id}/`);

    return data;
  },

  /* ----------- ARCHIVAR / RESTAURAR ----------- */
  async archivar(id: number) {
    const { data } = await apiClient.post(`/huerta/huertas-rentadas/${id}/archivar/`);
    return data;
  },

  async restaurar(id: number) {
    const { data } = await apiClient.post(`/huerta/huertas-rentadas/${id}/restaurar/`);
    return data;
  },
};
