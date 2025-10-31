// frontend/src/modules/gestion_bodega/services/reportesBodegaService.ts
import apiClient from '../../../global/api/apiClient';

/** Enforce envelope success para servicios de reportes */
function ensureSuccess<T>(resp: any): T {
  const { success, data, notification } = resp || {};
  if (!success) {
    const message = notification?.message || "Operación no exitosa";
    const error = new Error(message);
    (error as any).message_key = notification?.key;
    (error as any).payload = resp;
    throw error;
  }
  return data as T;
}

export type ReporteSemanalDTO = {
  /** Temporada obligatoria */
  temporada: number;
  /** Semana ISO preferida por API; si no llega, el backend puede inferir desde fechas */
  iso_semana?: string;
  /** Alternativa: rango explícito (yyyy-mm-dd) */
  fecha_desde?: string;
  fecha_hasta?: string;
};

export type ReporteTemporadaDTO = {
  /** Temporada obligatoria */
  temporada: number;
  /** Filtros adicionales opcionales (depende de backend) */
  [k: string]: any;
};

export const reportesBodegaService = {
  /**
   * Reporte semanal — Alineado a backend: método POST con envelope.
   * Se recomienda pasar { temporada, iso_semana }.
   */
  semanal: async <T = any>(payload: ReporteSemanalDTO): Promise<T> => {
    const resp = await apiClient.post('/bodega/reportes/semanal/', payload);
    return ensureSuccess<T>(resp.data);
  },

  /**
   * (Compat) Variante GET previa. Úsala sólo si hay endpoints legacy que aún lean querystring.
   * Nota: no se garantiza que el backend acepte GET; preferir .semanal(payload).
   */
  semanalGetDeprecated: async <T = any>(params?: Partial<ReporteSemanalDTO>): Promise<T> => {
    const resp = await apiClient.get('/bodega/reportes/semanal/', { params });
    return ensureSuccess<T>(resp.data);
  },

  /** Reporte de temporada — mantiene GET si backend lo expone así. */
  temporada: async <T = any>(params: ReporteTemporadaDTO): Promise<T> => {
    const resp = await apiClient.get('/bodega/reportes/temporada/', { params });
    return ensureSuccess<T>(resp.data);
  },
};

export default reportesBodegaService;
