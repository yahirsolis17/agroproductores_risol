import apiClient from '../../../global/api/apiClient';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import {
  ReporteCosechaRequest,
  ReportePerfilHuertaRequest,
  ReporteProduccionResponse,
  ReporteTemporadaRequest,
} from '../types/reportesProduccionTypes';
import {
  blobToJson,
  downloadFile,
  getFilename,
  isJsonContent,
  unwrapReportePayload,
} from '../utils/reportesPayload';

const BASE = '/huerta/reportes';
const PROFILE_YEARS_KEY = 'a\u00f1os';

const safeHandleBackendNotification = (payload: unknown) => {
  try {
    handleBackendNotification(payload);
  } catch {
    // Export endpoints can return non-standard payloads on failure.
  }
};

async function postBlobAndDownload(
  endpoint: string,
  payload: unknown,
  filenameBase: string,
  ext: 'pdf' | 'xlsx',
): Promise<ReporteProduccionResponse> {
  const resp = await apiClient.post(endpoint, payload, { responseType: 'blob' });
  const contentType = String(resp.headers['content-type'] || '');

  if (isJsonContent(contentType)) {
    const json = await blobToJson(resp.data as Blob);
    safeHandleBackendNotification(json);
    return {
      success: false,
      message: json?.message || json?.detail || 'Error al exportar',
      errors: json?.errors,
    };
  }

  const blob = new Blob([resp.data], { type: contentType });
  const contentDisposition = resp.headers['content-disposition'];
  const filename = getFilename(contentDisposition, `${filenameBase}.${ext}`);
  downloadFile(blob, filename || `${filenameBase}.${ext}`);
  return { success: true, data: blob };
}

async function handleExportError(err: any): Promise<ReporteProduccionResponse> {
  const contentType = err?.response?.headers?.['content-type'] || '';
  if (err?.response?.data && err.response.data instanceof Blob && isJsonContent(contentType)) {
    const json = await blobToJson(err.response.data);
    safeHandleBackendNotification(json);
    return {
      success: false,
      message: json?.message || 'Error al exportar',
      errors: json?.errors,
    };
  }

  return {
    success: false,
    message: 'Error de conexion al generar el reporte',
    errors: { general: ['Error de red'] },
  };
}

export const reportesProduccionService = {
  async generarReporteCosecha(request: ReporteCosechaRequest): Promise<ReporteProduccionResponse> {
    try {
      const payload: Record<string, unknown> = {
        cosecha_id: request.cosecha_id,
        formato: request.formato,
      };
      if (request.force_refresh !== undefined) payload.force_refresh = request.force_refresh;
      if (request.formato === 'json') {
        const resp = await apiClient.post(`${BASE}/cosecha/`, payload);
        const unwrapped = unwrapReportePayload(resp.data);
        return { success: true, data: unwrapped, message: resp.data?.message, errors: resp.data?.errors };
      }

      const ext: 'pdf' | 'xlsx' = request.formato === 'pdf' ? 'pdf' : 'xlsx';
      return await postBlobAndDownload(`${BASE}/cosecha/`, payload, `reporte_cosecha_${request.cosecha_id}`, ext);
    } catch (err: any) {
      return handleExportError(err);
    }
  },

  async generarReporteTemporada(request: ReporteTemporadaRequest): Promise<ReporteProduccionResponse> {
    try {
      const payload: Record<string, unknown> = {
        temporada_id: request.temporada_id,
        formato: request.formato,
      };
      if (request.force_refresh !== undefined) payload.force_refresh = request.force_refresh;
      if (request.formato === 'json') {
        const resp = await apiClient.post(`${BASE}/temporada/`, payload);
        const unwrapped = unwrapReportePayload(resp.data);
        return { success: true, data: unwrapped, message: resp.data?.message, errors: resp.data?.errors };
      }

      const ext: 'pdf' | 'xlsx' = request.formato === 'pdf' ? 'pdf' : 'xlsx';
      return await postBlobAndDownload(
        `${BASE}/temporada/`,
        payload,
        `reporte_temporada_${request.temporada_id}`,
        ext,
      );
    } catch (err: any) {
      return handleExportError(err);
    }
  },

  async generarReportePerfilHuerta(request: ReportePerfilHuertaRequest): Promise<ReporteProduccionResponse> {
    try {
      const payload: Record<string, unknown> = {
        formato: request.formato,
        [PROFILE_YEARS_KEY]: (request as unknown as Record<string, unknown>)[PROFILE_YEARS_KEY] ?? 5,
      };

      if (request.force_refresh !== undefined) payload.force_refresh = request.force_refresh;
      if (request.huerta_id) payload.huerta_id = request.huerta_id;
      if (request.huerta_rentada_id) payload.huerta_rentada_id = request.huerta_rentada_id;

      if (request.formato === 'json') {
        const resp = await apiClient.post(`${BASE}/perfil-huerta/`, payload);
        const unwrapped = unwrapReportePayload(resp.data);
        return { success: true, data: unwrapped, message: resp.data?.message, errors: resp.data?.errors };
      }

      const ext: 'pdf' | 'xlsx' = request.formato === 'pdf' ? 'pdf' : 'xlsx';
      const fileId = request.huerta_id ?? request.huerta_rentada_id ?? 'perfil';
      return await postBlobAndDownload(`${BASE}/perfil-huerta/`, payload, `reporte_perfil_huerta_${fileId}`, ext);
    } catch (err: any) {
      return handleExportError(err);
    }
  },
};
