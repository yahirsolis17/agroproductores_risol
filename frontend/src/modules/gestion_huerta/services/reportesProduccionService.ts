// modules/gestion_huerta/services/reportesProduccionService.ts

import apiClient from '../../../global/api/apiClient';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import {
  ReporteCosechaRequest,
  ReporteTemporadaRequest,
  ReportePerfilHuertaRequest,
  ReporteProduccionResponse,
} from '../types/reportesProduccionTypes';
import {
  unwrapReportePayload,
  isJsonContent,
  blobToJson,
  downloadFile,
  getFilename,
} from '../utils/reportesPayload';

// 🔁 Nueva base alineada al backend reestructurado
const BASE = '/huerta/reportes';

/** Post que espera blob y, si es éxito, descarga; si es JSON de error, lo interpreta */
async function postBlobAndDownload(
  endpoint: string,
  payload: any,
  filenameBase: string,
  ext: 'pdf' | 'xlsx'
): Promise<ReporteProduccionResponse> {
  const resp = await apiClient.post(endpoint, payload, { responseType: 'blob' });
  const contentType: string = resp.headers['content-type'] || '';

  if (isJsonContent(contentType)) {
    const json = await blobToJson(resp.data as Blob);
    try { handleBackendNotification(json); } catch {}
    return {
      success: false,
      message: json?.message || json?.detail || 'Error al exportar',
      errors: json?.errors
    };
  }

  const blob = new Blob([resp.data], { type: contentType });
  const cd = resp.headers['content-disposition'];
  const fname = getFilename(cd, `${filenameBase}.${ext}`);
  downloadFile(blob, fname || `${filenameBase}.${ext}`);
  return { success: true, data: blob };
}

export const reportesProduccionService = {
  async generarReporteCosecha(request: ReporteCosechaRequest): Promise<ReporteProduccionResponse> {
    try {
      const payload = { ...request }; // incluye force_refresh si vino
      if (request.formato === 'json') {
        const resp = await apiClient.post(`${BASE}/cosecha/`, payload);
        try { handleBackendNotification(resp.data); } catch {}
        const unwrapped = unwrapReportePayload(resp.data);
        return { success: true, data: unwrapped, message: resp.data?.message, errors: resp.data?.errors };
      }

      const ext: 'pdf' | 'xlsx' = request.formato === 'pdf' ? 'pdf' : 'xlsx';
      return await postBlobAndDownload(
        `${BASE}/cosecha/`,
        payload,
        `reporte_cosecha_${request.cosecha_id}`,
        ext
      );
    } catch (err: any) {
      const ct = err?.response?.headers?.['content-type'] || '';
      if (err?.response?.data && err.response.data instanceof Blob && isJsonContent(ct)) {
        const json = await blobToJson(err.response.data);
        try { handleBackendNotification(json); } catch {}
        return { success: false, message: json?.message || 'Error al exportar', errors: json?.errors };
      }
      return { success: false, message: 'Error de conexión al generar el reporte', errors: { general: ['Error de red'] } };
    }
  },

  async generarReporteTemporada(request: ReporteTemporadaRequest): Promise<ReporteProduccionResponse> {
    try {
      const payload = { ...request }; // incluye force_refresh si vino
      if (request.formato === 'json') {
        const resp = await apiClient.post(`${BASE}/temporada/`, payload);
        try { handleBackendNotification(resp.data); } catch {}
        const unwrapped = unwrapReportePayload(resp.data);
        return { success: true, data: unwrapped, message: resp.data?.message, errors: resp.data?.errors };
      }

      const ext: 'pdf' | 'xlsx' = request.formato === 'pdf' ? 'pdf' : 'xlsx';
      return await postBlobAndDownload(
        `${BASE}/temporada/`,
        payload,
        `reporte_temporada_${request.temporada_id}`,
        ext
      );
    } catch (err: any) {
      const ct = err?.response?.headers?.['content-type'] || '';
      if (err?.response?.data && err.response.data instanceof Blob && isJsonContent(ct)) {
        const json = await blobToJson(err.response.data);
        try { handleBackendNotification(json); } catch {}
        return { success: false, message: json?.message || 'Error al exportar', errors: json?.errors };
      }
      return { success: false, message: 'Error de conexión al generar el reporte', errors: { general: ['Error de red'] } };
    }
  },

  async generarReportePerfilHuerta(request: ReportePerfilHuertaRequest): Promise<ReporteProduccionResponse> {
    try {
      // Sanitizar payload según backend (una de las dos IDs)
      const payload: any = {
        formato: request.formato,
        años: request.años ?? 5,
      };
      if (request.force_refresh !== undefined) payload.force_refresh = request.force_refresh;
      if (request.huerta_id) payload.huerta_id = request.huerta_id;
      if (request.huerta_rentada_id) payload.huerta_rentada_id = request.huerta_rentada_id;

      if (request.formato === 'json') {
        const resp = await apiClient.post(`${BASE}/perfil-huerta/`, payload);
        try { handleBackendNotification(resp.data); } catch {}
        const unwrapped = unwrapReportePayload(resp.data);
        return { success: true, data: unwrapped, message: resp.data?.message, errors: resp.data?.errors };
      }

      const ext: 'pdf' | 'xlsx' = request.formato === 'pdf' ? 'pdf' : 'xlsx';
      const fileId = request.huerta_id ?? request.huerta_rentada_id ?? 'perfil';
      return await postBlobAndDownload(
        `${BASE}/perfil-huerta/`,
        payload,
        `reporte_perfil_huerta_${fileId}`,
        ext
      );
    } catch (err: any) {
      const ct = err?.response?.headers?.['content-type'] || '';
      if (err?.response?.data && err.response.data instanceof Blob && isJsonContent(ct)) {
        const json = await blobToJson(err.response.data);
        try { handleBackendNotification(json); } catch {}
        return { success: false, message: json?.message || 'Error al exportar', errors: json?.errors };
      }
      return { success: false, message: 'Error de conexión al generar el reporte', errors: { general: ['Error de red'] } };
    }
  },
};
