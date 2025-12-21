// frontend/src/modules/gestion_bodega/services/empaquesService.ts
import apiClient from "../../../global/api/apiClient";
import type {
  EmpaqueCreateDTO,
  EmpaqueUpdateDTO,
  EmpaqueListResponse,
  EmpaqueRow,
  EmpaquesFilters,
  EmpaqueBulkUpsertDTO,
  EmpaqueBulkUpsertResponse,
} from "../types/empaquesTypes";

/**
 * Ajusta esta ruta base si tu módulo usa otro prefijo.
 * Por cómo registraste el router en backend/gestion_bodega/urls.py:
 *   router.register(r"empaques", ClasificacionEmpaqueViewSet, basename="empaques")
 * normalmente queda como: /bodega/empaques/
 * (dependiendo de tu include principal).
 */
const BASE_URL = "/bodega/empaques/";

function unwrapData<T>(resData: any): T {
  // NotificationHandler: { success, message_key, message, data }
  return (resData?.data ?? resData) as T;
}

function normalizeEmpaqueRow(row: any): EmpaqueRow {
  return {
    id: Number(row.id),

    recepcion: Number(row.recepcion),
    bodega: Number(row.bodega),
    temporada: Number(row.temporada),
    semana: row.semana !== null && row.semana !== undefined ? Number(row.semana) : null,

    fecha: String(row.fecha),
    material: row.material,
    calidad: String(row.calidad),
    tipo_mango: String(row.tipo_mango ?? ""),
    cantidad_cajas: Number(row.cantidad_cajas ?? 0),

    is_active: Boolean(row.is_active),
    archivado_en: row.archivado_en ?? null,

    creado_en: String(row.creado_en ?? ""),
    actualizado_en: String(row.actualizado_en ?? ""),
  };
}

export const empaquesService = {
  async list(params: EmpaquesFilters = {}): Promise<EmpaqueListResponse> {
    const res = await apiClient.get(BASE_URL, { params });
    const payload = unwrapData<any>(res.data);

    const resultsRaw = payload?.results ?? payload?.empaques ?? [];
    const meta = payload?.meta ?? {
      count: resultsRaw.length,
      next: null,
      previous: null,
      page: 1,
      page_size: resultsRaw.length,
      total_pages: 1,
    };

    return {
      results: (resultsRaw as any[]).map(normalizeEmpaqueRow),
      meta,
    };
  },

  async retrieve(id: number): Promise<EmpaqueRow> {
    const res = await apiClient.get(`${BASE_URL}${id}/`);
    const payload = unwrapData<any>(res.data);
    const row = payload?.clasificacion ?? payload?.empaque ?? payload;
    return normalizeEmpaqueRow(row);
  },

  async create(dto: EmpaqueCreateDTO): Promise<EmpaqueRow> {
    const res = await apiClient.post(BASE_URL, dto);
    const payload = unwrapData<any>(res.data);
    const row = payload?.clasificacion ?? payload?.empaque ?? payload;
    return normalizeEmpaqueRow(row);
  },

  async update(id: number, dto: EmpaqueUpdateDTO): Promise<EmpaqueRow> {
    const res = await apiClient.put(`${BASE_URL}${id}/`, dto);
    const payload = unwrapData<any>(res.data);
    const row = payload?.clasificacion ?? payload?.empaque ?? payload;
    return normalizeEmpaqueRow(row);
  },

  async patch(id: number, dto: EmpaqueUpdateDTO): Promise<EmpaqueRow> {
    const res = await apiClient.patch(`${BASE_URL}${id}/`, dto);
    const payload = unwrapData<any>(res.data);
    const row = payload?.clasificacion ?? payload?.empaque ?? payload;
    return normalizeEmpaqueRow(row);
  },

  /**
   * En tu backend, destroy() = archivar() (soft delete).
   */
  async archivar(id: number): Promise<{ id: number }> {
    await apiClient.delete(`${BASE_URL}${id}/`);
    return { id };
  },

  async bulkUpsert(dto: EmpaqueBulkUpsertDTO): Promise<EmpaqueBulkUpsertResponse> {
    const res = await apiClient.post(`${BASE_URL}bulk-upsert/`, dto);
    const payload = unwrapData<any>(res.data);
    return payload as EmpaqueBulkUpsertResponse;
  },
};
