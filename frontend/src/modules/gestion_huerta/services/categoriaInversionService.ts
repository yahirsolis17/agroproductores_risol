// src/modules/gestion_huerta/services/categoriaInversionService.ts
import apiClient from '../../../global/api/apiClient';

export interface CategoriaInversion {
  id: number;
  nombre: string;
}

interface CategoriaListResponse {
  categorias: CategoriaInversion[];
}

export const categoriaInversionService = {
  async list() {
    // GET /api/categorias/
    const { data } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: CategoriaListResponse;
    }>('/api/categorias/');
    return data;
  },

  async create(payload: { nombre: string }) {
    // POST /api/categoria/create/
    const { data } = await apiClient.post('/api/categoria/create/', payload);
    return data;
  },

  async update(id: number, payload: { nombre: string }) {
    // PUT /api/categoria/update/<id>/
    const { data } = await apiClient.put(`/api/categoria/update/${id}/`, payload);
    return data;
  },

  async delete(id: number) {
    // DELETE /api/categoria/delete/<id>/
    const { data } = await apiClient.delete(`/api/categoria/delete/${id}/`);
    return data;
  },
};
