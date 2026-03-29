import apiClient from '../../../global/api/apiClient';
import { ApiEnvelope, ListEnvelope } from '../types/shared';
import { PreCosecha, PreCosechaCreateData, PreCosechaUpdateData } from '../types/precosechaTypes';

type RawPreCosecha = Record<string, unknown>;

const asNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const asStringOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return String(value);
};

const mapPreCosecha = (raw: RawPreCosecha): PreCosecha => ({
  id: asNumber(raw.id),
  fecha: asStringOrNull(raw.fecha) ?? '',
  descripcion: asStringOrNull(raw.descripcion),
  gastos_insumos: asNumber(raw.gastos_insumos),
  gastos_mano_obra: asNumber(raw.gastos_mano_obra),
  gastos_totales: asNumber(raw.gastos_totales),
  categoria: asNumber(raw.categoria),
  temporada: asNumber(raw.temporada),
  huerta: raw.huerta == null ? null : asNumber(raw.huerta),
  huerta_rentada: raw.huerta_rentada == null ? null : asNumber(raw.huerta_rentada),
  is_active: Boolean(raw.is_active),
  archivado_en: asStringOrNull(raw.archivado_en),
});

export const precosechaService = {
  async list(params: {
    page?: number;
    temporadaId: number;
    categoriaId?: number;
    estado?: 'activas' | 'archivadas' | 'todas';
    fechaDesde?: string;
    fechaHasta?: string;
    search?: string;
  }) {
    const query: Record<string, unknown> = {
      page: params.page ?? 1,
      page_size: 10,
      temporada: params.temporadaId,
      estado: params.estado ?? 'activas',
    };
    if (params.categoriaId) query.categoria = params.categoriaId;
    if (params.fechaDesde) query.fecha_desde = params.fechaDesde;
    if (params.fechaHasta) query.fecha_hasta = params.fechaHasta;
    if (params.search) query.search = params.search;

    const { data } = await apiClient.get<ListEnvelope<PreCosecha>>('/huerta/precosechas/', { params: query });
    if (Array.isArray(data?.data?.results)) {
      return {
        ...data,
        data: {
          ...data.data,
          results: data.data.results.map((raw: any) => mapPreCosecha(raw)),
        },
      };
    }
    return data;
  },

  async create(payload: PreCosechaCreateData) {
    const body = {
      fecha: payload.fecha,
      descripcion: payload.descripcion ?? '',
      gastos_insumos: payload.gastos_insumos,
      gastos_mano_obra: payload.gastos_mano_obra,
      categoria_id: payload.categoria,
      temporada_id: payload.temporada,
    };
    const { data } = await apiClient.post<ApiEnvelope<{ precosecha: PreCosecha }>>('/huerta/precosechas/', body);
    if (data?.data?.precosecha) data.data.precosecha = mapPreCosecha(data.data.precosecha as unknown as RawPreCosecha);
    return data;
  },

  async update(id: number, payload: PreCosechaUpdateData) {
    const body: Record<string, unknown> = {};
    if (payload.fecha !== undefined) body.fecha = payload.fecha;
    if (payload.descripcion !== undefined) body.descripcion = payload.descripcion;
    if (payload.gastos_insumos !== undefined) body.gastos_insumos = payload.gastos_insumos;
    if (payload.gastos_mano_obra !== undefined) body.gastos_mano_obra = payload.gastos_mano_obra;
    if (payload.categoria !== undefined) body.categoria_id = payload.categoria;

    const { data } = await apiClient.put<ApiEnvelope<{ precosecha: PreCosecha }>>(`/huerta/precosechas/${id}/`, body);
    if (data?.data?.precosecha) data.data.precosecha = mapPreCosecha(data.data.precosecha as unknown as RawPreCosecha);
    return data;
  },

  async archivar(id: number) {
    const { data } = await apiClient.post<ApiEnvelope<{ precosecha: PreCosecha }>>(`/huerta/precosechas/${id}/archivar/`);
    if (data?.data?.precosecha) data.data.precosecha = mapPreCosecha(data.data.precosecha as unknown as RawPreCosecha);
    return data;
  },

  async restaurar(id: number) {
    const { data } = await apiClient.post<ApiEnvelope<{ precosecha: PreCosecha }>>(`/huerta/precosechas/${id}/restaurar/`);
    if (data?.data?.precosecha) data.data.precosecha = mapPreCosecha(data.data.precosecha as unknown as RawPreCosecha);
    return data;
  },

  async delete(id: number) {
    const { data } = await apiClient.delete<ApiEnvelope<{ info: string }>>(`/huerta/precosechas/${id}/`);
    return data;
  },
};
