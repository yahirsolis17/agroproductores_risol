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
    // GET /huerta/categorias/
    const { data } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: CategoriaListResponse;
    }>('/huerta/categorias/');
    return data;
  },

  async create(payload: { nombre: string }) {
    // POST /huerta/categoria/create/
    const { data } = await apiClient.post<{
      success: boolean;
      message_key: string;
      data: { categoria?: CategoriaInversion };
    }>('/huerta/categoria/create/', payload);
    return data;
  },

  async update(id: number, payload: { nombre: string }) {
    // PUT /huerta/categoria/update/<id>/
    const { data } = await apiClient.put<{
      success: boolean;
      message_key: string;
      data: { categoria?: CategoriaInversion };
    }>(`/huerta/categoria/update/${id}/`, payload);
    return data;
  },

  async delete(id: number) {
    // DELETE /huerta/categoria/delete/<id>/
    const { data } = await apiClient.delete<{
      success: boolean;
      message_key: string;
      data: { info?: string };
    }>(`/huerta/categoria/delete/${id}/`);
    return data;
  },
};
