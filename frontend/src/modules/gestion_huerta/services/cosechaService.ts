// src/modules/gestion_huerta/services/cosechaService.ts
import apiClient from '../../../global/api/apiClient';
import { Cosecha, CosechaCreateData, CosechaUpdateData } from '../types/cosechaTypes';

export const cosechaService = {
  async listByHuerta(huertaId: number) {
    // GET /huerta/cosechas/<huerta_id>/
    const { data } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: { cosechas: Cosecha[] };
    }>(`/huerta/cosechas/${huertaId}/`);
    return data;
  },

  async create(payload: CosechaCreateData) {
    // POST /huerta/cosecha/create/
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: { cosecha?: Cosecha };
    }>('/huerta/cosecha/create/', payload);
    return data;
  },

  async get(id: number) {
    // GET /huerta/cosecha/<id>/
    const { data } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: { cosecha: Cosecha };
    }>(`/huerta/cosecha/${id}/`);
    return data;
  },

  async update(id: number, payload: CosechaUpdateData) {
    // PUT /huerta/cosecha/<id>/update/
    const { data } = await apiClient.put<{
      success: boolean;
      message_key: string;
      data: { cosecha?: Cosecha };
    }>(`/huerta/cosecha/${id}/update/`, payload);
    return data;
  },

  async delete(id: number) {
    // DELETE /huerta/cosecha/<id>/delete/
    const { data } = await apiClient.delete<{
      success: boolean;
      message_key: string;
      data: { info?: string };
    }>(`/huerta/cosecha/${id}/delete/`);
    return data;
  },

  async toggle(id: number) {
    // POST /huerta/cosecha/<id>/toggle/
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: { cosecha: Cosecha };
    }>(`/huerta/cosecha/${id}/toggle/`);
    return data;
  },
};
