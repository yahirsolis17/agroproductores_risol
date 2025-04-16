// src/modules/gestion_huerta/services/cosechaService.ts
import apiClient from '../../../global/api/apiClient';
import { Cosecha, CosechaCreateData, CosechaUpdateData } from '../types/cosechaTypes';

// No estás paginando las cosechas, excepto al listarlas con un huerta_id
// GET /api/cosechas/<huerta_id> => returns an array directly or simple JSON?
// Observé que devuelves un simple:  [ {...}, {...} ]

export const cosechaService = {
  async listByHuerta(huertaId: number) {
    // GET /api/cosechas/<huerta_id>/
    const { data } = await apiClient.get<Cosecha[]>(`/api/cosechas/${huertaId}/`);
    return data; // array de Cosecha
  },

  async create(payload: CosechaCreateData) {
    // POST /api/cosecha/create/
    const { data } = await apiClient.post('/api/cosecha/create/', payload);
    return data; // Podrías tiparlo con success, message_key, data: { ... }
  },

  async get(id: number) {
    // GET /api/cosecha/<id>/
    const { data } = await apiClient.get(`/api/cosecha/${id}/`);
    return data; // { ...Cosecha }
  },

  async update(id: number, payload: CosechaUpdateData) {
    // PUT /api/cosecha/<id>/update/
    const { data } = await apiClient.put(`/api/cosecha/${id}/update/`, payload);
    return data;
  },

  async delete(id: number) {
    // DELETE /api/cosecha/<id>/delete/
    const { data } = await apiClient.delete(`/api/cosecha/${id}/delete/`);
    return data;
  },

  async toggle(id: number) {
    // POST /api/cosecha/<id>/toggle/
    const { data } = await apiClient.post(`/api/cosecha/${id}/toggle/`);
    return data;
  },
};
