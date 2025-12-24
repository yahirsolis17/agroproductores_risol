// src/modules/gestion_huerta/services/temporadaService.ts
import apiClient from '../../../global/api/apiClient';
import { Temporada, TemporadaCreateData, EstadoTemporada } from '../types/temporadaTypes';
import { ApiEnvelope, ListEnvelope } from '../types/shared';

export const temporadaService = {
  async list(
    page: number = 1,
    año?: number,
    huertaId?: number,
    huertaRentadaId?: number,
    estado?: EstadoTemporada,                // 👈 clave: usar EstadoTemporada aquí
    finalizada?: boolean,
    search?: string
  ) {
    const params: Record<string, any> = { page, page_size: 10 };
    if (año) params['año'] = año;
    if (huertaId) params['huerta'] = huertaId;
    if (huertaRentadaId) params['huerta_rentada'] = huertaRentadaId;
    if (estado) params['estado'] = estado;
    if (finalizada !== undefined) params['finalizada'] = finalizada;
    if (search) params['search'] = search;

    const { data } = await apiClient.get<ListEnvelope<Temporada>>('/huerta/temporadas/', { params });
    return data;
  },

  async create(payload: TemporadaCreateData) {
    const response = await apiClient.post<ApiEnvelope<{ temporada: Temporada }>>('/huerta/temporadas/', payload);
    return response.data;
  },

  async delete(id: number) {
    const response = await apiClient.delete<ApiEnvelope<{ info: string }>>(`/huerta/temporadas/${id}/`);
    return response.data;
  },

  async finalizar(id: number) {
    const response = await apiClient.post<ApiEnvelope<{ temporada: Temporada }>>(
      `/huerta/temporadas/${id}/finalizar/`
    );
    return response.data;
  },

  async archivar(id: number) {
    const response = await apiClient.post<ApiEnvelope<{ temporada: Temporada }>>(
      `/huerta/temporadas/${id}/archivar/`
    );
    return response.data;
  },

  async restaurar(id: number) {
    const response = await apiClient.post<ApiEnvelope<{ temporada: Temporada }>>(
      `/huerta/temporadas/${id}/restaurar/`
    );
    return response.data;
  },

  getById(id: number): Promise<ApiEnvelope<{ temporada: Temporada }>> {
    return apiClient.get<ApiEnvelope<{ temporada: Temporada }>>(`/huerta/temporadas/${id}/`).then((res) => res.data);
  },
};
