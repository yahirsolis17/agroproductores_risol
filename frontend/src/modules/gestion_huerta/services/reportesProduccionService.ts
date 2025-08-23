// frontend/src/modules/gestion_huerta/services/reportesProduccionService.ts
import apiClient from '../../../global/api/apiClient';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import {
  ReporteCosechaRequest,
  ReporteTemporadaRequest,
  ReportePerfilHuertaRequest,
  ReporteProduccionResponse
} from '../types/reportesProduccionTypes';

const BASE = '/huerta/reportes-produccion';

/** Desencapsula el payload típico del backend (NotificationHandler) */
const unwrapJson = (json: any) => {
  if (!json) return json;
  if (json.data?.reporte) return json.data.reporte;
  if (json.reporte) return json.reporte;
  if (json.data) return json.data;
  return json;
};

const isJsonContent = (ct?: string) =>
  !!ct && (ct.includes('application/json') || ct.includes('text/json'));

const blobToJson = async (blob: Blob) => {
  const text = await blob.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/** Post que espera blob y, si es éxito, descarga; si es JSON de error, lo interpreta */
async function postBlobAndDownload(
  endpoint: string,
  payload: any,
  filenameBase: string,
  ext: 'pdf' | 'xlsx'
): Promise<ReporteProduccionResponse> {
  const resp = await apiClient.post(endpoint, payload, { responseType: 'blob' });
  const contentType: string = resp.headers['content-type'] || '';

  // Si el servidor devolvió JSON (posible error en blob)
  if (isJsonContent(contentType)) {
    const json = await blobToJson(resp.data as Blob);
    try { handleBackendNotification(json); } catch {}
    return {
      success: false,
      message: json?.message || json?.detail || 'Error al exportar',
      errors: json?.errors
    };
  }

  // Éxito: descargar
  const blob = new Blob([resp.data], { type: contentType });
  downloadFile(blob, `${filenameBase}.${ext}`);
  return { success: true, data: blob };
}

export const reportesProduccionService = {
  async generarReporteCosecha(request: ReporteCosechaRequest): Promise<ReporteProduccionResponse> {
    try {
      // JSON para render en pantalla (no descarga)
      if (request.formato === 'json') {
        const resp = await apiClient.post(`${BASE}/cosecha/`, request);
        try { handleBackendNotification(resp.data); } catch {}
        const unwrapped = unwrapJson(resp.data);
        return { success: true, data: unwrapped, message: resp.data?.message, errors: resp.data?.errors };
      }

      // PDF / Excel → descarga directa con Axios blob
      const ext: 'pdf' | 'xlsx' = request.formato === 'pdf' ? 'pdf' : 'xlsx';
      return await postBlobAndDownload(
        `${BASE}/cosecha/`,
        request,
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
      if (request.formato === 'json') {
        const resp = await apiClient.post(`${BASE}/temporada/`, request);
        try { handleBackendNotification(resp.data); } catch {}
        const unwrapped = unwrapJson(resp.data);
        return { success: true, data: unwrapped, message: resp.data?.message, errors: resp.data?.errors };
      }

      const ext: 'pdf' | 'xlsx' = request.formato === 'pdf' ? 'pdf' : 'xlsx';
      return await postBlobAndDownload(
        `${BASE}/temporada/`,
        request,
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
      if (request.formato === 'json') {
        const resp = await apiClient.post(`${BASE}/perfil-huerta/`, request);
        try { handleBackendNotification(resp.data); } catch {}
        const unwrapped = unwrapJson(resp.data);
        return { success: true, data: unwrapped, message: resp.data?.message, errors: resp.data?.errors };
      }

      const ext: 'pdf' | 'xlsx' = request.formato === 'pdf' ? 'pdf' : 'xlsx';
      return await postBlobAndDownload(
        `${BASE}/perfil-huerta/`,
        request,
        `reporte_perfil_huerta_${request.huerta_id}`,
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
