//src/modules/gestion_usuarios/services/userService.ts
import apiClient from '../../../global/api/apiClient';
import { User, PaginationMeta } from '../types/userTypes';

interface UsersResponse extends PaginationMeta {
  results: User[];
  count: number;
  next: string | null;
  previous: string | null;
}

export const userService = {
  list: (page = 1, pageSize = 10) =>
    apiClient.get<UsersResponse>('/usuarios/users/', {
      params: { page, page_size: pageSize },
    }),
};