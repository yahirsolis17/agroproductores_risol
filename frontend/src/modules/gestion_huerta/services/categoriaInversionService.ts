import apiClient from '../../../global/api/apiClient';
import {
  CategoriaInversion,
  CategoriaInversionCreateData,
  CategoriaInversionUpdateData,
} from '../types/categoriaInversionTypes';

interface ListEnv {
  success: boolean;
  data: { categorias: CategoriaInversion[]; meta: any };
}
interface ItemEnv {
  success: boolean;
  data: { categoria_inversion: CategoriaInversion };
}
interface InfoEnv {
  success: boolean;
  data: { info: string };
}

export const categoriaInversionService = {
  /* ───── Listar solo activas ───── */
  async listActive(
    page = 1,
    pageSize = 10,
    config: { signal?: AbortSignal } = {}
  ) {
    const { data } = await apiClient.get<ListEnv>(
      '/huerta/categorias-inversion/',
      { params: { page, page_size: pageSize, archivado: 'false' }, ...config }
    );
    return data.data;
  },

  /* ───── Buscar (autocomplete) ───── */
  async search(
    q: string,
    config: { signal?: AbortSignal } = {}
  ): Promise<CategoriaInversion[]> {
    const { data } = await apiClient.get<ListEnv>(
      '/huerta/categorias-inversion/',
      { params: { search: q, page_size: 30 }, ...config }
    );
    return data.data.categorias;
  },

// 1. create
async create(payload: CategoriaInversionCreateData): Promise<CategoriaInversion> {
  const { data } = await apiClient.post<ItemEnv>(
    '/huerta/categorias-inversion/',
    payload
  );
  return data.data.categoria_inversion;
},

// 2. update
async update(id: number, payload: CategoriaInversionUpdateData): Promise<CategoriaInversion> {
  const { data } = await apiClient.patch<ItemEnv>(
    `/huerta/categorias-inversion/${id}/`,
    payload
  );
  return data.data.categoria_inversion;
},

// 3. archive
async archive(id: number): Promise<CategoriaInversion> {
  const { data } = await apiClient.patch<ItemEnv>(
    `/huerta/categorias-inversion/${id}/archivar/`
  );
  return data.data.categoria_inversion;
},

// 4. restore
async restore(id: number): Promise<CategoriaInversion> {
  const { data } = await apiClient.patch<ItemEnv>(
    `/huerta/categorias-inversion/${id}/restaurar/`
  );
  return data.data.categoria_inversion;
},

  async remove(id: number) {
    return apiClient.delete<InfoEnv>(
      `/huerta/categorias-inversion/${id}/`
    );
  },
};
