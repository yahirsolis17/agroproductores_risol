// src/modules/gestion_huerta/services/categoriaInversionService.ts
import apiClient from '../../../global/api/apiClient';
import {
  CategoriaInversion,
  CategoriaInversionCreateData,
  CategoriaInversionUpdateData,
} from '../types/categoriaInversionTypes';
import { ApiEnvelope, ListEnvelope, Notification, PaginationMeta } from '../types/shared';

export const categoriaInversionService = {
  /* ------------ LIST ACTIVE ------------ */
  async listActive(
    page = 1,
    pageSize = 100,
    config: { signal?: AbortSignal } = {}
  ): Promise<ListEnvelope<CategoriaInversion>> {
    const { data } = await apiClient.get<ListEnvelope<CategoriaInversion>>(
      '/huerta/categorias-inversion/',
      { params: { page, page_size: pageSize }, signal: config.signal }
    );
    return data;
  },

  /* ------------ LIST ALL (activas + archivadas) ------------ */
  async listAll(
    page = 1,
    pageSize = 500,
    config: { signal?: AbortSignal } = {}
  ): Promise<ListEnvelope<CategoriaInversion>> {
    const { data } = await apiClient.get<ListEnvelope<CategoriaInversion>>(
      '/huerta/categorias-inversion/all/',
      { params: { page, page_size: pageSize }, signal: config.signal }
    );
    return data;
  },

  /* ------------ SEARCH (autocomplete) ------------ */
  async search(query: string, cfg: { signal?: AbortSignal } = {}): Promise<ListEnvelope<CategoriaInversion>> {
    if (!query.trim()) {
      const emptyMeta: PaginationMeta = {
        count: 0,
        next: null,
        previous: null,
        page: 1,
        page_size: 50,
        total_pages: 1,
      };
      const notification: Notification = { key: 'no_notification', message: '', type: 'info' };
      return { success: true, notification, data: { results: [], meta: emptyMeta } };
    }
    const { data } = await apiClient.get<ListEnvelope<CategoriaInversion>>('/huerta/categorias-inversion/', {
      params: { search: query, page_size: 50 },
      signal: cfg.signal,
    });
    return data;
  },

  /* ------------ CRUD (devuelven ENVELOPE para notificación del backend) ------------ */
  async create(payload: CategoriaInversionCreateData): Promise<ApiEnvelope<{ categoria: CategoriaInversion }>> {
    const { data } = await apiClient.post<ApiEnvelope<{ categoria: CategoriaInversion }>>(
      '/huerta/categorias-inversion/',
      payload
    );
    return data;
  },

  async update(id: number, payload: CategoriaInversionUpdateData): Promise<ApiEnvelope<{ categoria: CategoriaInversion }>> {
    const { data } = await apiClient.patch<ApiEnvelope<{ categoria: CategoriaInversion }>>(
      `/huerta/categorias-inversion/${id}/`,
      payload
    );
    return data;
  },

  async archive(id: number): Promise<ApiEnvelope<{ categoria: CategoriaInversion }>> {
    const { data } = await apiClient.post<ApiEnvelope<{ categoria: CategoriaInversion }>>(
      `/huerta/categorias-inversion/${id}/archivar/`
    );
    return data;
  },

  async restore(id: number): Promise<ApiEnvelope<{ categoria: CategoriaInversion }>> {
    const { data } = await apiClient.post<ApiEnvelope<{ categoria: CategoriaInversion }>>(
      `/huerta/categorias-inversion/${id}/restaurar/`
    );
    return data;
  },

  async remove(id: number): Promise<ApiEnvelope<{ info: string }>> {
    const { data } = await apiClient.delete<ApiEnvelope<{ info: string }>>(
      `/huerta/categorias-inversion/${id}/`
    );
    return data;
  },
};
