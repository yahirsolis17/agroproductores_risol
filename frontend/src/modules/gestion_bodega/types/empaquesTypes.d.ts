// frontend/src/modules/gestion_bodega/types/empaquesTypes.d.ts
import type { Material, PaginationMeta } from "./shared";

export type { PaginationMeta };

export type EmpaqueStatus = "SIN_EMPAQUE" | "PARCIAL" | "EMPACADO";

/**
 * Fila (línea) de empaque = ClasificacionEmpaque (backend).
 * Nota: tipo_mango es server-truth (read-only en backend).
 */
export interface EmpaqueRow {
  id: number;

  recepcion: number;
  bodega: number;
  temporada: number;
  semana: number | null;

  fecha: string; // YYYY-MM-DD
  material: Material;
  calidad: string; // incluye "MERMA"
  tipo_mango: string; // server-truth
  cantidad_cajas: number;

  is_active: boolean;
  archivado_en: string | null;

  creado_en: string;
  actualizado_en: string;
}

export interface EmpaqueListResponse {
  results: EmpaqueRow[];
  meta: PaginationMeta;
}

/**
 * Payload para crear (serializer individual).
 * El backend exige recepcion_id/bodega_id/temporada_id (aunque valida server-truth).
 * tipo_mango NO se envía (read-only).
 */
export interface EmpaqueCreateDTO {
  recepcion_id: number;
  bodega_id: number;
  temporada_id: number;
  fecha: string; // YYYY-MM-DD
  material: Material;
  calidad: string;
  cantidad_cajas: number;
}

/**
 * Payload para update.
 * tipo_mango NO se envía (read-only).
 */
export type EmpaqueUpdateDTO = Partial<Omit<EmpaqueCreateDTO, "recepcion_id">>;

/**
 * Bulk upsert (captura rápida).
 * La vista ya fuerza tipo_mango desde recepción.
 * Items NO requieren tipo_mango.
 */
export interface EmpaqueBulkUpsertItemDTO {
  material: Material;
  calidad: string;
  cantidad_cajas: number;
}

export interface EmpaqueBulkUpsertDTO {
  recepcion: number;
  bodega: number;
  temporada: number;
  fecha: string; // YYYY-MM-DD
  items: EmpaqueBulkUpsertItemDTO[];
}

/**
 * Summary que regresa el backend en bulk-upsert
 */
export interface EmpaqueBulkUpsertSummary {
  recepcion_id: number;
  empaque_status: EmpaqueStatus;
  cajas_empaquetadas: number;
  cajas_disponibles: number;
  cajas_merma: number;
  empaque_id: null; // explícito: empaque son líneas
}

export interface EmpaqueBulkUpsertResponse {
  created_ids: number[];
  updated_ids: number[];
  summary: EmpaqueBulkUpsertSummary;
}

/**
 * Filtros típicos para list.
 * Mantengo shape "params" para que sea plug-and-play con GenericPagination.
 */
export interface EmpaquesFilters {
  page?: number;
  page_size?: number;

  bodega?: number;
  temporada?: number;
  recepcion?: number;
  semana?: number;

  material?: Material;
  calidad?: string;
  tipo_mango?: string;

  fecha__gte?: string;
  fecha__lte?: string;

  is_active?: boolean;

  search?: string;
  ordering?: string;
}
