// Meta de paginación uniforme (envelope o DRF)
export type PaginationMeta = {
  count: number;
  next: string | null;
  previous: string | null;
  page: number | null;
  page_size: number | null;
  total_pages: number | null;
  // Flags extendidos desde el backend (opcional)
  semana_cerrada?: boolean;
  temporada_finalizada?: boolean;
  semana_rango?: { from?: string; to?: string };
};

// ------------ Dominio: Capturas (backend: Recepciones) ------------
export interface Captura {
  id: number;

  // Relaciones
  bodega: number;
  temporada: number;

  // Datos de la captura
  fecha: string;                 // "YYYY-MM-DD"
  huertero_nombre: string;
  tipo_mango: string;
  cantidad_cajas: number;

  observaciones?: string | null;

  // Estado base
  is_active: boolean;

  // Timestamps (si el backend los expone)
  creado_en?: string;
  actualizado_en?: string;
}

// ------------ DTOs de escritura ------------
export type CapturaCreateDTO = {
  bodega: number;
  temporada: number;
  fecha: string;               // "YYYY-MM-DD"
  huertero_nombre: string;
  tipo_mango: string;
  cantidad_cajas: number;
  observaciones?: string | null;
};

export type CapturaUpdateDTO = CapturaCreateDTO;
export type CapturaPatchDTO = Partial<CapturaUpdateDTO>;

// ------------ Query Params (lista) ------------
export type CapturaListParams = {
  page?: number;
  page_size?: number;
  ordering?: string; // "fecha" | "-fecha" | "id" | "-id" | "creado_en" | "-creado_en"

  // Filtros server-side
  estado?: "activas" | "archivadas" | "todas";
  bodega?: number;
  temporada?: number;
  search?: string;
  tipo_mango?: string;

  // Filtros por fecha (exacta o rango)
  fecha?: string;        // "YYYY-MM-DD"
  fecha_gte?: string;    // -> se enviará como fecha__gte
  fecha_lte?: string;    // -> se enviará como fecha__lte
};

// ------------ Responses normalizadas para el FE ------------
export type CapturasListResponse = {
  capturas: Captura[];
  meta: PaginationMeta;
};

export type CapturaSingleResponse = {
  captura: Captura;
};

// ------------ ALIAS para compatibilidad con slices/hooks ------------
export type CapturaFilters = CapturaListParams;
export type CapturaCreatePayload = CapturaCreateDTO;
export type CapturaUpdatePayload = CapturaUpdateDTO;
