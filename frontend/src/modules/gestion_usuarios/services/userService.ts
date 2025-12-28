// src/modules/gestion_usuarios/services/userService.ts
import apiClient from '../../../global/api/apiClient';
import { ensureSuccess } from '../../../global/utils/backendEnvelope';
import { User, PaginationMeta } from '../types/userTypes';
import { BackendResponse } from '../../../global/types/apiTypes';

export const userService = {
  list: async (
    page: number = 1,
    estado: 'activos' | 'archivados' | 'todos' = 'activos',
    filters?: { excludeRole?: string }
  ) => {
    const params: any = { page, estado };
    if (filters?.excludeRole) {
      params.exclude_role = filters.excludeRole;
    }
    const res = await apiClient.get(
      '/usuarios/users/',
      { params }
    );
    const env = ensureSuccess<{ results: User[]; meta: PaginationMeta }>(res.data);
    return env as BackendResponse<{ results: User[]; meta: PaginationMeta }>;
  },
  archivar: async (id: number) => {
    const res = await apiClient.patch(`/usuarios/users/${id}/archivar/`);
    return ensureSuccess<{ user: User }>(res.data) as BackendResponse<{ user: User }>;
  },
  restaurar: async (id: number) => {
    const res = await apiClient.patch(`/usuarios/users/${id}/restaurar/`);
    return ensureSuccess<{ user: User }>(res.data) as BackendResponse<{ user: User }>;
  },
  delete: async (id: number) => {
    const res = await apiClient.delete(`/usuarios/users/${id}/`);
    return ensureSuccess<{ info?: string }>(res.data) as BackendResponse<{ info?: string }>;
  },
};
