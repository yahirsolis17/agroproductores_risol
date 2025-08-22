// frontend/src/modules/gestion_huerta/types/reportesProduccionTypes.ts

export type FormatoReporte = 'json' | 'pdf' | 'excel';

export interface ReporteProduccionRequest {
  formato: FormatoReporte;
  fecha_inicio?: string;
  fecha_fin?: string;
}

export interface ReporteCosechaRequest extends ReporteProduccionRequest {
  cosecha_id: number;
}

export interface ReporteTemporadaRequest extends ReporteProduccionRequest {
  temporada_id: number;
}

export interface ReportePerfilHuertaRequest extends ReporteProduccionRequest {
  huerta_id: number;
}

export interface ReporteProduccionResponse {
  success: boolean;
  data?: any;
  message?: string;
  errors?: Record<string, string[]>;
}

// Tipos para los datos del reporte
export interface KPIData {
  label: string;
  value: number | string;
  format?: 'currency' | 'percentage' | 'number';
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
}

export interface SeriesDataPoint {
  fecha: string;
  valor: number;
  categoria?: string;
}

export interface TablaInversion {
  id: number;
  categoria: string;
  descripcion: string;
  monto: number;
  fecha: string;
}

export interface TablaVenta {
  id: number;
  fecha: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  comprador?: string;
}

export interface ReporteProduccionData {
  kpis: KPIData[];
  series: {
    inversiones?: SeriesDataPoint[];
    ventas?: SeriesDataPoint[];
    ganancias?: SeriesDataPoint[];
  };
  tablas: {
    inversiones?: TablaInversion[];
    ventas?: TablaVenta[];
  };
  metadata: {
    periodo: {
      inicio: string;
      fin: string;
    };
    entidad: {
      id: number;
      nombre: string;
      tipo: 'cosecha' | 'temporada' | 'huerta';
    };
    generado_en: string;
    generado_por: string;
  };
}
