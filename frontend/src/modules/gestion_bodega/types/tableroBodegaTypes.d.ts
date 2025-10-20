// frontend/src/modules/gestion_bodega/types/tableroBodegaTypes.d.ts

export type QueueType = "recepciones" | "ubicaciones" | "despachos";
export type AlertSeverity = "info" | "warning" | "critical";

export interface KpiSummary {
  recepcion?: {
    kg_total: number;
    kg_apto: number;
    kg_merma: number;
    apto_pct: number;   // 0..1
    merma_pct: number;  // 0..1
    hoy: number;
    semana: number;
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
    recepcion_a_ubicacion_h: number | null;
    ubicacion_a_despacho_h: number | null;
  };
}

export interface DashboardSummaryResponse {
  kpis: KpiSummary;
}

export interface QueueItem {
  id: number;
  ref: string;
  fecha: string; // ISO
  huerta: string | null;
  kg: number;
  estado: string;
  meta?: Record<string, any>;
}

export interface DashboardQueueResponse {
  meta: {
    page: number;
    page_size: number;
    total: number;
    pages?: number;
  };
  results: QueueItem[];
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
}

/**
 * Filtros que viajan al backend (DTO).
 * Ojo: los campos de UI (ej. busquedas libres) no se incluyen aquí.
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
