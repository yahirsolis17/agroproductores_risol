// src/modules/gestion_usuarios/services/userService.ts
import apiClient from '../../../global/api/apiClient';
import { User, PaginationMeta } from '../types/userTypes';

interface UsersResponse {
  results: User[];
  meta: PaginationMeta;
}

export const userService = {
  list: (page = 1, estado: 'activos' | 'archivados' | 'todos' = 'activos') =>
    apiClient.get<UsersResponse>('/usuarios/users/', {
      params: { page, estado },
    }),
};
