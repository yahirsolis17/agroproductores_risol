export type FormatoReporte = 'json' | 'pdf' | 'excel' | 'xlsx';

export interface ReporteBodegaRequestBase {
  bodega: number;
  temporada: number;
  formato: FormatoReporte;
  force_refresh?: boolean;
}

export interface ReporteSemanalRequest extends ReporteBodegaRequestBase {
  iso_semana: string;
}

export type ReporteTemporadaRequest = ReporteBodegaRequestBase;

export interface ReporteBodegaResponse<TData = ReporteBodegaData | Blob> {
  success: boolean;
  data?: TData;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface ReporteBodegaMetadata {
  tipo?: string;
  bodega?: {
    id?: number;
    nombre?: string;
  };
  temporada?: {
    id?: number;
    year?: number | string;
    anio?: number | string;
  };
  fecha_generacion?: string;
}

export interface ReporteBodegaRango {
  desde?: string;
  hasta?: string;
  iso?: string;
}

export interface ReporteBodegaKPI {
  id: string;
  label: string;
  value: string | number;
  icon?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value?: number;
  };
}

export interface ReporteTable {
  columns: string[];
  rows: Array<Array<string | number>>;
}

export interface ReporteSeriesPointXY {
  x: string;
  y: number;
}

export interface ReporteSeriesPointPie {
  name: string;
  value: number;
}

export type ReporteSeriesPoint = ReporteSeriesPointXY | ReporteSeriesPointPie;

export interface ReporteSeries {
  id: string;
  label: string;
  type: 'bar' | 'line' | 'area' | 'pie' | string;
  data: ReporteSeriesPoint[];
}

export interface ReporteBodegaData {
  metadata: ReporteBodegaMetadata;
  rango?: ReporteBodegaRango;
  kpis: ReporteBodegaKPI[];
  tablas: Record<string, ReporteTable>;
  series: ReporteSeries[];
  totales?: Record<string, number | string>;
}

export interface ReportesBodegaState {
  semanalData: ReporteBodegaData | null;
  temporadaData: ReporteBodegaData | null;
  isLoading: boolean;
  error: string | null;
}
