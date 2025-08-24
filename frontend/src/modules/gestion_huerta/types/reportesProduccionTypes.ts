export type FormatoReporte = 'json' | 'pdf' | 'excel';

export interface ReporteProduccionRequest {
  formato: FormatoReporte;
}

export interface ReporteCosechaRequest extends ReporteProduccionRequest {
  cosecha_id: number;
}

export interface ReporteTemporadaRequest extends ReporteProduccionRequest {
  temporada_id: number;
}

export interface ReportePerfilHuertaRequest extends ReporteProduccionRequest {
  /** Una u otra según backend */
  huerta_id?: number;
  huerta_rentada_id?: number;
  /** Opcional (1..10). Default 5 en backend. */
  años?: number;
}

export interface ReporteProduccionResponse {
  success: boolean;
  data?: any;
  message?: string;
  errors?: Record<string, string[]>;
}

/** Ficha de huerta/cosecha para cabecera */
export interface InfoHuerta {
  huerta_nombre: string;
  huerta_tipo: 'Propia' | 'Rentada' | string;
  propietario?: string;
  ubicacion?: string;
  hectareas?: number;
  temporada_año?: number | string;
  cosecha_nombre?: string;
  estado?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}

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
  /** YYYY-MM-DD o YYYY-MM (temporadas) */
  fecha: string;
  valor: number;
  categoria?: string;
}

export interface TablaInversion {
  id: number;
  categoria: string;
  descripcion: string;
  monto: number;
  fecha: string;   // YYYY-MM-DD
}

export interface TablaVenta {
  id: number;
  fecha: string;   // YYYY-MM-DD
  cantidad: number;
  precio_unitario: number;
  total: number;
  comprador?: string;
}

/** Nueva: fila comparativa por cosecha (temporada) */
export interface FilaComparativoCosecha {
  cosecha: string;
  inversion: number;
  ventas: number;
  ganancia: number;
  roi: number;      // %
  cajas: number;
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
    /** Nueva para temporadas */
    comparativo_cosechas?: FilaComparativoCosecha[];
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
    infoHuerta?: InfoHuerta;
  };
}
