// src/modules/gestion_huerta/services/huertaService.ts
import apiClient from '../../../global/api/apiClient';
import {
  Huerta,
  HuertaCreateData,
  HuertaUpdateData,
} from '../types/huertaTypes';

interface HuertaListResponse {
  huertas: Huerta[];
  count: number;
  next: string | null;
  previous: string | null;
  meta: {
    count: number;
    next: string | null;
    previous: string | null;
  };
}

interface HuertaPayload {
  huerta?: Huerta;
  info?: string;
}

export const huertaService = {
  /* ---------- CRUD básico ---------- */
  async list(page = 1) {
    const { data } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: HuertaListResponse;
    }>(`/huerta/huertas/?page=${page}`);
    return data;
  },

  async create(payload: HuertaCreateData) {
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: HuertaPayload;
    }>('/huerta/huertas/', payload);
    return data;
  },

  async update(id: number, payload: HuertaUpdateData) {
    const { data } = await apiClient.put<{
      success: boolean;
      message_key: string;
      data: HuertaPayload;
    }>(`/huerta/huertas/${id}/`, payload);
    return data;
  },

  async delete(id: number) {
    const { data } = await apiClient.delete<{
      success: boolean;
      message_key: string;
      data: HuertaPayload;
    }>(`/huerta/huertas/${id}/`);
    return data;
  },

  /* ---------- NUEVO: archivar / restaurar ---------- */
  async archivar(id: number) {
    const { data } = await apiClient.post(`/huerta/huertas/${id}/archivar/`);
    return data;
  },

  async restaurar(id: number) {
    const { data } = await apiClient.post(`/huerta/huertas/${id}/restaurar/`);
    return data;
  },
};
