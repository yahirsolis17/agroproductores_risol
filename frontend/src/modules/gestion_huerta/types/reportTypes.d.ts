// frontend/src/modules/gestion_huerta/types/reportTypes.d.ts
export type SerieType = 'line' | 'bar';

export interface KPI {
  id: string;
  label: string;
  value: number;
}

export interface SeriePoint {
  month: string; // "YYYY-MM"
  total: number;
  // opcional en histórico
  temp?: number | string;
}

export interface Serie {
  id: string;
  label: string;
  type: SerieType;
  data: SeriePoint[];
}

export interface Tabla {
  columns: string[];
  rows: (string | number)[][];
}

export interface TablaCosecha {
  inversiones: Tabla;
  ventas: Tabla;
}

export interface ReportPayload {
  kpis: KPI[];
  series: Serie[];
  // cosecha => TablaCosecha, temporada y perfil => Tabla
  tabla: any;
}
