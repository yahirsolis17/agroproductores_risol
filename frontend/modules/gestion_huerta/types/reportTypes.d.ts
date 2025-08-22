// frontend/modules/gestion_huerta/types/reportTypes.d.ts

export interface KPI {
  id: string;
  label: string;
  value: number;
  hint?: string;
}

export interface SeriePoint {
  x: string | number;
  y: number;
}

export interface Serie {
  id: string;
  label: string;
  type: 'bar' | 'line';
  data: SeriePoint[];
}

export interface TablaColumn {
  id: string;
  label: string;
  align?: 'left' | 'right' | 'center';
}

export interface Tabla {
  columns: TablaColumn[];
  rows: Record<string, any>[];
}

export interface ReporteContrato {
  kpis: KPI[];
  series: Serie[];
  tabla: Tabla;
}

