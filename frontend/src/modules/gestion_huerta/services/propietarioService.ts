/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from '../../../global/api/apiClient';
import {
  Propietario,
  PropietarioCreateData,
  PropietarioUpdateData,
} from '../types/propietarioTypes';

/* -------------------------------------------------------------------------- */
/*  Interfaces de respuesta                                                   */
/* -------------------------------------------------------------------------- */
interface ListResp {
  propietarios: Propietario[];
  meta: { count: number; next: string | null; previous: string | null };
}

interface ItemWrapper { propietario: Propietario }

/* -------------------------------------------------------------------------- */
/*  Helper → traduce estado ☞ query param “archivado”                         */
/* -------------------------------------------------------------------------- */
const estadoToQuery = (estado: 'activos' | 'archivados' | 'todos') =>
  estado === 'todos' ? undefined : estado === 'activos' ? 'false' : 'true';

/* -------------------------------------------------------------------------- */
/*  Helper de formato (DRY)                                                   */
/* -------------------------------------------------------------------------- */
const toOption = (p: Propietario) => ({
  label: `${p.nombre} ${p.apellidos} – ${p.telefono}`,
  value: p.id,
});

/* -------------------------------------------------------------------------- */
/*  API                                                                       */
/* -------------------------------------------------------------------------- */
export const propietarioService = {
  /* ------------ LIST ------------ */
  async list(
    page = 1,
    estado: 'activos' | 'archivados' | 'todos',
    filters: Record<string, any> = {}
  ) {
    const params: Record<string, any> = { page };
    const arch = estadoToQuery(estado);
    if (arch !== undefined) params.archivado = arch;
    Object.assign(params, filters);

    const { data } = await apiClient.get<{
      success: boolean; message_key: string; data: ListResp;
    }>('/huerta/propietarios/', { params });

    return data.data;
  },

  async getConHuertas(search?: string): Promise<ListResp> {
    const params: Record<string, any> = {};
    if (search) params.search = search;
    const { data } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: ListResp;
    }>('/huerta/propietarios/solo-con-huertas/', { params });
    return data.data;
  },


  /* ------------ CREATE ------------ */
  async create(payload: PropietarioCreateData) {
    const { data } = await apiClient.post<{
      success: boolean; message_key: string; data: ItemWrapper;
    }>('/huerta/propietarios/', payload);
    return data;
  },

  /* ------------ UPDATE ------------ */
  async update(id: number, payload: PropietarioUpdateData) {
    const { data } = await apiClient.put<{
      success: boolean; message_key: string; data: ItemWrapper;
    }>(`/huerta/propietarios/${id}/`, payload);
    return data;
  },

  /* ------------ DELETE ------------ */
  async delete(id: number) {
    const { data } = await apiClient.delete<{
      success: boolean; message_key: string; data: { info: string };
    }>(`/huerta/propietarios/${id}/`);
    return data;
  },

  /* ------------ ARCHIVAR / RESTAURAR ------------ */
  async archive(id: number) {
    const { data } = await apiClient.patch<{
      success: boolean; message_key: string; data: ItemWrapper;
    }>(`/huerta/propietarios/${id}/archivar/`);
    return data;
  },
  async restore(id: number) {
    const { data } = await apiClient.patch<{
      success: boolean; message_key: string; data: ItemWrapper;
    }>(`/huerta/propietarios/${id}/restaurar/`);
    return data;
  },

  /* ------------ FETCH BY ID (para precarga) ------------ */
  async fetchById(id: string | number): Promise<Propietario | null> {
    try {
      const { data } = await apiClient.get<{
        success: boolean;
        message_key: string;
        data: { propietario: Propietario };
      }>('/huerta/propietarios/buscar/', { params: { id } });
      return data.data.propietario;
    } catch {
      return null;
    }
  },

  /* ------------ SEARCH Autocomplete (ID o texto) ------------ */
  async searchAutocomplete(
    query: string
  ): Promise<{ label: string; value: number }[]> {
    if (!query.trim()) return [];

    /* --- Si es numérico → buscar por ID exacto --- */
    if (/^\d+$/.test(query)) {
      const p = await this.fetchById(query);
      return p ? [toOption(p)] : [];
    }

    /* --- Caso texto → búsqueda parcial --- */
    const { data } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: { propietarios: Propietario[] };
    }>('/huerta/propietarios/', {
      params: { search: query, page_size: 50 },
    });

    return data.data.propietarios.map(toOption);
  },

  /* ------------ Legacy búsqueda por texto (sin formato option) ------------ */
  async search(query: string): Promise<Propietario[]> {
    if (!query.trim()) return [];
    const { data } = await apiClient.get<{
      success: boolean;
      message_key: string;
      data: { propietarios: Propietario[] };
    }>('/huerta/propietarios/', {
      params: { search: query, page_size: 50 },
    });
    return data.data.propietarios;
  },
};
