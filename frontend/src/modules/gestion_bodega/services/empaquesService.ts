// frontend/src/modules/gestion_bodega/services/empaquesService.ts
import apiClient from "../../../global/api/apiClient";
import { 
  normalizeCalidadToBackend, 
  normalizeCalidadToUI, 
  transformDisponiblesAgrupados 
} from "../utils/empaquesUtils";
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

function unwrapData<T>(resData: unknown): T {
  // NotificationHandler: { success, message_key, message, data }
  const anyData = resData as any;
  return (anyData?.data ?? anyData) as T;
}

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clampInt(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.floor(v));
}

// Funciones de normalización movidas a empaquesUtils.ts para reducir acoplamiento

function normalizeEmpaqueRow(row: unknown): EmpaqueRow {
  const r = row as any;

  const material = String(r.material ?? "").toUpperCase();
  const calidadUI = normalizeCalidadToUI(material, String(r.calidad ?? ""));

  return {
    id: Number(r.id),

    recepcion: Number(r.recepcion),
    bodega: Number(r.bodega),
    temporada: Number(r.temporada),
    semana: toNumberOrNull(r.semana),

    fecha: String(r.fecha ?? ""),
    material: r.material,
    calidad: String(calidadUI),
    tipo_mango: String(r.tipo_mango ?? ""),
    cantidad_cajas: clampInt(r.cantidad_cajas),

    is_active: Boolean(r.is_active),
    archivado_en: r.archivado_en ?? null,

    creado_en: String(r.creado_en ?? ""),
    actualizado_en: String(r.actualizado_en ?? ""),
  };
}

function buildMetaFromDRF(payload: any, resultsLen: number) {
  // Soporta: { count, next, previous, results } clásico DRF
  const count = Number(payload?.count ?? resultsLen);
  const next = payload?.next ?? null;
  const previous = payload?.previous ?? null;

  // page/page_size/total_pages pueden venir en meta o no venir.
  // Si no vienen, inferimos mínimos seguros.
  const page = Number(payload?.page ?? 1);
  const page_size = Number(
    payload?.page_size !== undefined && payload?.page_size !== null
      ? payload.page_size
      : resultsLen || 10
  );
  const total_pages =
    payload?.total_pages !== undefined
      ? Number(payload.total_pages)
      : page_size > 0
        ? Math.max(1, Math.ceil(count / page_size))
        : 1;

  return { count, next, previous, page, page_size, total_pages };
}

export const empaquesService = {
  async list(params: EmpaquesFilters = {}): Promise<EmpaqueListResponse> {
    const res = await apiClient.get(BASE_URL, { params });
    const payload = unwrapData<any>(res.data);

    // Preferimos estructura canónica: { results, meta }
    const resultsRaw = payload?.results ?? (Array.isArray(payload) ? payload : []);
    const meta = payload?.meta ?? buildMetaFromDRF(payload, Array.isArray(resultsRaw) ? resultsRaw.length : 0);

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

  async listDisponibles(params: { bodega: number; temporada: number; semana?: number | null }): Promise<EmpaqueRow[]> {
    const res = await apiClient.get(`${BASE_URL}disponibles/`, { params });
    const payload = unwrapData<any>(res.data);
    const resultsRaw = payload?.results ?? [];

    // Normalizamos y aseguramos que tenga el campo disponible
    return (resultsRaw as any[]).map(r => ({
      ...normalizeEmpaqueRow(r),
      disponible: Number(r.disponible || 0)
    }));
  },

  /**
   * Lista stock disponible AGRUPADO por (calidad, material, tipo_mango).
   * Para usar en Autocomplete de logística (camiones).
   * Retorna combinaciones únicas con disponible total.
   */
  async listDisponiblesAgrupados(params: { bodega: number; temporada: number; semana?: number | null }): Promise<Array<{
    calidad: string;
    material: string;
    tipo_mango: string;
    disponible: number;
    fecha_min: string; // Primera fecha (FEFO reference)
    huerteros: string; // Comma-separated unique huertero names
  }>> {
    const res = await apiClient.get(`${BASE_URL}disponibles/`, { params });
    const payload = unwrapData<any>(res.data);
    const resultsRaw = payload?.results ?? [];

    return transformDisponiblesAgrupados(resultsRaw);
  },

  /**
   * En tu backend, destroy() = archivar() (soft delete).
   */
  async archivar(id: number): Promise<{ id: number }> {
    await apiClient.delete(`${BASE_URL}${id}/`);
    return { id };
  },

  async bulkUpsert(dto: EmpaqueBulkUpsertDTO): Promise<EmpaqueBulkUpsertResponse> {
    const cleanDto: EmpaqueBulkUpsertDTO = {
      ...dto,
      items: dto.items.map((i) => ({
        ...i,
        calidad: normalizeCalidadToBackend(i.material, i.calidad),
        cantidad_cajas: clampInt(i.cantidad_cajas),
      })),
    };

    const res = await apiClient.post(`${BASE_URL}bulk-upsert/`, cleanDto);
    const payload = unwrapData<any>(res.data);

    return payload as EmpaqueBulkUpsertResponse;
  },
};
