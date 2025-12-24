/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from '../../../global/api/apiClient';
import { ApiEnvelope, ListEnvelope } from '../types/shared';
import {
  Propietario,
  PropietarioCreateData,
  PropietarioUpdateData,
} from '../types/propietarioTypes';

/* -------------------------------------------------------------------------- */
/*  Tipos auxiliares                                                          */
/* -------------------------------------------------------------------------- */
type ReqCfg = { signal?: AbortSignal };

/** Estructura de meta “rica” para paginación */
interface ItemWrapper { propietario: Propietario }

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */
// Traducir estado de UI → query param “archivado”
const estadoToQuery = (estado: 'activos' | 'archivados' | 'todos') =>
  estado === 'todos' ? undefined : estado === 'activos' ? 'false' : 'true';

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
    filters: Record<string, any> = {},
    config: { signal?: AbortSignal; pageSize?: number } = {}
  ): Promise<ListEnvelope<Propietario>> {
    const pageSize = config.pageSize ?? 10;
    const params: Record<string, any> = { page, page_size: pageSize };

    const arch = estadoToQuery(estado);
    if (arch !== undefined) params.archivado = arch;

    Object.assign(params, filters);

    const { data } = await apiClient.get<ListEnvelope<Propietario>>('/huerta/propietarios/', {
      params,
      signal: config.signal,
    });
    return data;
  },

  /* ------------ SOLO CON HUERTAS (con cancelación) ------------ */
  getConHuertas(
    search: string,
    config: ReqCfg = {},
    includeArchived = false
  ): Promise<ListEnvelope<Propietario>> {
    const params: Record<string, any> = { page_size: 50 }; // evita truncar en 1ra página
    if (search) params.search = search;
    if (!includeArchived) params.archivado = 'false';

    return apiClient
      .get<ListEnvelope<Propietario>>('/huerta/propietarios/solo-con-huertas/', {
        params,
        signal: config.signal,
      })
      .then(res => res.data);
  },

  /* ------------ CREATE ------------ */
  async create(payload: PropietarioCreateData) {
    const { data } = await apiClient.post<ApiEnvelope<ItemWrapper>>('/huerta/propietarios/', payload);
    return data;
  },

  /* ------------ UPDATE ------------ */
  async update(id: number, payload: PropietarioUpdateData) {
    const { data } = await apiClient.put<ApiEnvelope<ItemWrapper>>(`/huerta/propietarios/${id}/`, payload);
    return data;
  },

  /* ------------ DELETE ------------ */
  async delete(id: number) {
    const { data } = await apiClient.delete<ApiEnvelope<{ info: string }>>(`/huerta/propietarios/${id}/`);
    return data;
  },

  /* ------------ ARCHIVAR / RESTAURAR ------------ */
  async archive(id: number) {
    const { data } = await apiClient.patch<ApiEnvelope<ItemWrapper>>(`/huerta/propietarios/${id}/archivar/`);
    return data;
  },
  async restore(id: number) {
    const { data } = await apiClient.patch<ApiEnvelope<ItemWrapper>>(`/huerta/propietarios/${id}/restaurar/`);
    return data;
  },

  /* ------------ FETCH BY ID (para precarga) ------------ */
  async fetchById(id: string | number, config: ReqCfg = {}): Promise<Propietario | null> {
    try {
      const { data } = await apiClient.get<ApiEnvelope<{ propietario: Propietario }>>('/huerta/propietarios/buscar/', {
        params: { id },
        signal: config.signal,
      });
      return data.data.propietario;
    } catch {
      return null;
    }
  },

  /* ------------ SEARCH Autocomplete (ID o texto) ------------ */
  async searchAutocomplete(
    query: string,
    signal?: AbortSignal,
    includeArchived = false
  ): Promise<{ label: string; value: number }[]> {
    if (!query.trim()) return [];

    if (/^\d+$/.test(query)) {
      const p = await this.fetchById(query, { signal });
      return p ? [toOption(p)] : [];
    }

    const params: Record<string, any> = { search: query, page_size: 50 };
    if (!includeArchived) params.archivado = 'false';

    const { data } = await apiClient.get<ListEnvelope<Propietario>>('/huerta/propietarios/', { params, signal });

    return data.data.results.map(toOption);
  },

  /* ------------ SEARCH (lista cruda) con cancelación ------------ */
  async search(
    query: string,
    config: ReqCfg = {},
    includeArchived = false
  ): Promise<Propietario[]> {
    if (!query.trim()) return [];

    const params: Record<string, any> = { search: query, page_size: 50 };
    if (!includeArchived) params.archivado = 'false';

    const { data } = await apiClient.get<ListEnvelope<Propietario>>('/huerta/propietarios/', {
      params,
      signal: config.signal,
    });

    return data.data.results;
  },
};
