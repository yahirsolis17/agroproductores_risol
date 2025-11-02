// frontend/src/modules/gestion_bodega/types/tableroBodegaTypes.d.ts

export type QueueType = "recepciones" | "inventarios" | "despachos";
export type AlertSeverity = "info" | "warning" | "critical";

export interface WeekActive {
  id: number;
  fecha_inicio: string;                   // "YYYY-MM-DD"
  fecha_fin: string | null;               // null si abierta
  rango_inferido: { from: string; to: string };
  estado: "ABIERTA" | "CERRADA";
  iso_semana: string | null;
}

/** Contexto común adjuntado por el backend para identificar la temporada en UI */
export interface TableroContext {
  temporada_id: number;
  temporada_label: string;
  /** Nombre legible de bodega (opcional) */
  bodega_label?: string;
  /** Opcional: semana activa inferida por backend para bodega+temporada */
  active_week?: WeekActive | null;
}

export interface KpiSummary {
  recepcion?: {
    kg_total: number;
    kg_apto: number;
    kg_merma: number;
    apto_pct: number | null;   // backend puede mandar null
    merma_pct: number | null;  // backend puede mandar null
    hoy: number | null;        // backend puede mandar null
    semana: number | null;     // backend puede mandar null
  };
  stock?: {
    total_kg: number;
    por_madurez: Record<string, number>;
    por_calidad: Record<string, number>;
  };
  ocupacion?: {
    total_pct: number; // 0..1
    por_camara: Array<{
      camara: string;
      capacidad_kg: number;
      ocupado_kg: number;
      pct: number; // 0..1
    }>;
  };
  rotacion?: {
    dias_promedio_bodega: number;
  };
  fefo?: {
    compliance_pct: number | null; // null => N/A
  };
  rechazos_qc?: {
    tasa_pct: number; // 0..1
    top_causas: Array<{ causa: string; pct: number }>;
  };
  lead_times?: {
    recepcion_a_inventario_h: number | null;
    inventario_a_despacho_h: number | null;
  };
}

export interface DashboardSummaryResponse {
  kpis: KpiSummary;
  /** Contexto agregado por backend (temporada legible, y opcionalmente active_week) */
  context?: TableroContext;
}

export interface QueueItem {
  id: number;
  ref: string;
  fecha: string; // ISO
  huerta: string | null;
  kg: number;    // el backend manda "kg"; en UI lo mostramos como "cajas" si aplica
  estado: string;
  meta?: Record<string, any>;
}

export interface DashboardQueueResponse {
  meta: {
    // forma usada por UI previa
    page?: number;
    page_size?: number;
    total?: number;
    pages?: number;

    // forma real del backend (GenericPagination)
    count?: number;
    total_pages?: number;
    next?: string | null;
    previous?: string | null;
  };
  results: QueueItem[];
  /** Contexto agregado por backend */
  context?: TableroContext;
}

export interface AlertItem {
  code: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  link: {
    path: string;
    query?: Record<string, any>;
  };
}

export interface DashboardAlertResponse {
  alerts: AlertItem[];
  /** Contexto agregado por backend */
  context?: TableroContext;
}

/**
 * Filtros que viajan al backend (DTO).
 * Ojo: los campos de UI (ej. búsquedas libres) no se incluyen aquí.
 */
export interface TableroFiltersDTO {
  huerta_id: number | null;
  fecha_desde: string | null; // yyyy-mm-dd
  fecha_hasta: string | null; // yyyy-mm-dd
  estado_lote: string | null;
  calidad: string | null;
  madurez: string | null;
  solo_pendientes: boolean;
  page: number;
  page_size: number;
  order_by: string | null;
}

/** Estado de UI (Redux) */
export interface TableroUIState {
  temporadaId: number | null;

  // Filtros globales
  filters: TableroFiltersDTO;

  // Tab activo en Work Queues
  activeQueue: QueueType;

  // Señales de refetch sutil
  refreshSummaryAt: number | null;
  refreshAlertsAt: number | null;
  refreshQueuesAt: Partial<Record<QueueType, number | null>>;

  // Metadatos
  lastVisitedAt: number | null;
}

/** Respuesta para barra de navegación de semanas */
export type WeeksNavResponse = {
  /** Semana ISO actual (YYYY-Www) o null si no hay semanas */
  actual: string | null;
  /** Total de semanas definidas en la temporada */
  total: number;
  /** Flags navegación */
  has_prev: boolean;
  has_next: boolean;
  /** Claves ISO adyacentes (si aplican) */
  prev?: string | null;
  next?: string | null;
  /** Índice 1-based */
  indice?: number;
  /** Rango de fechas inferido (yyyy-mm-dd) para la semana de referencia (actual) */
  inicio?: string;
  fin?: string;

  /** Listado opcional de semanas con rangos (el backend puede enviarlo) */
  items?: Array<{
    id: number;
    iso_semana: string | null;
    inicio: string; // yyyy-mm-dd
    fin: string;    // yyyy-mm-dd
    cerrada: boolean;
  }>;

  /** Contexto agregado por backend */
  context?: TableroContext;
};

export interface WeekCurrentResponse {
  active_week: WeekActive | null;
  context?: TableroContext;
}

export interface WeekStartRequest {
  bodega: number;
  temporada: number;
  fecha_desde: string; // "YYYY-MM-DD"
}

export interface WeekFinishRequest {
  bodega: number;
  temporada: number;
  fecha_hasta: string; // "YYYY-MM-DD" (máx 7d desde fecha_desde)
}
