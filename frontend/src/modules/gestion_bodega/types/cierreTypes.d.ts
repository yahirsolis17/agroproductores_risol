// frontend/src/modules/gestion_bodega/types/cierreTypes.d.ts

export interface PaginationMeta {
  // Forma real del backend (GenericPagination)
  count?: number;
  total_pages?: number;
  next?: string | null;
  previous?: string | null;

  // Compatibilidad con UI previa
  page?: number;
  page_size?: number;
  total?: number;
  pages?: number;
}

export interface CierreSemanal {
  id: number;
  bodega: number;
  temporada: number;
  iso_semana: string;        // p.ej. "2025-W36"
  fecha_desde: string;       // "YYYY-MM-DD"
  fecha_hasta: string | null;// "YYYY-MM-DD" | null (ABIERTA si null)

  // Read-only del backend (serializer los expone)
  locked_by?: number | null;
  is_active?: boolean;
  archivado_en?: string | null;
  creado_en?: string;
  actualizado_en?: string;
}

export interface CierreSemanalListResponse {
  results: CierreSemanal[];
  meta: PaginationMeta;
}

export interface CierreSemanalCreatePayload {
  bodega: number;
  temporada: number;
  fecha_desde: string;               // "YYYY-MM-DD"
  fecha_hasta?: string | null;       // opcional; si no se envía => semana abierta
  iso_semana?: string | null;        // opcional; backend recalcula si no coincide
}

export interface CierreSemanalCreateResponse {
  cierre: CierreSemanal;
}

export interface CierreTemporadaPayload {
  temporada: number;
}

export interface CierreTemporadaResponse {
  temporada: {
    id: number;
    año: number;
    finalizada: boolean; // true tras cerrar
  };
}

export interface CierresIndexWeek {
  semana_ix: number;     // 1-based
  desde: string;         // "YYYY-MM-DD"
  hasta: string;         // "YYYY-MM-DD"
  iso_semana: string;    // "YYYY-Www"
  is_closed: boolean;    // true si existe cierre activo que cubre ese rango
}

export interface CierresIndexResponse {
  temporada: { id: number; año: number; finalizada: boolean };
  current_semana_ix: number; // índice actual basado en hoy/fecha_fin
  weeks: CierresIndexWeek[];
}
