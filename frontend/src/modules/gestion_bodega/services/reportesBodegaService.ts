import apiClient from '../../../global/api/apiClient';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import type {
  ReporteBodegaData,
  ReporteBodegaResponse,
  ReporteSemanalRequest,
  ReporteTemporadaRequest,
  FormatoReporte,
} from '../types/reportesBodegaTypes';
import {
  blobToJson,
  downloadFile,
  getFilename,
  isJsonContent,
  unwrapReportePayload,
} from '../utils/reportesPayload';

const BASE = '/bodega/reportes';
const JSON_REPORT_TTL_MS = 45_000;

type JsonCacheEntry = {
  expiresAt: number;
  data: ReporteBodegaData;
};

const jsonReportCache = new Map<string, JsonCacheEntry>();
const jsonReportInFlight = new Map<string, Promise<ReporteBodegaResponse<ReporteBodegaData>>>();

export type ReporteSemanalDTO = Omit<ReporteSemanalRequest, 'formato'>;
export type ReporteTemporadaDTO = Omit<ReporteTemporadaRequest, 'formato'>;

const toMessage = (payload: unknown, fallback: string): string => {
  if (!payload || typeof payload !== 'object') return fallback;
  const root = payload as Record<string, unknown>;
  const directMessage = root.message;
  if (typeof directMessage === 'string' && directMessage.trim()) return directMessage;
  const directDetail = root.detail;
  if (typeof directDetail === 'string' && directDetail.trim()) return directDetail;
  const notification = root.notification as Record<string, unknown> | undefined;
  const notifMessage = notification?.message;
  if (typeof notifMessage === 'string' && notifMessage.trim()) return notifMessage;
  return fallback;
};

const toErrors = (payload: unknown): Record<string, string[]> | undefined => {
  if (!payload || typeof payload !== 'object') return undefined;
  const root = payload as Record<string, unknown>;
  const errors = root.errors;
  if (errors && typeof errors === 'object') {
    return errors as Record<string, string[]>;
  }
  return undefined;
};

const isFresh = (entry?: JsonCacheEntry) => !!entry && entry.expiresAt > Date.now();

const buildJsonCacheKey = (scope: string, payload: unknown) =>
  `${scope}:${JSON.stringify(payload)}`;

const setJsonCache = (key: string, data: ReporteBodegaData) => {
  jsonReportCache.set(key, {
    data,
    expiresAt: Date.now() + JSON_REPORT_TTL_MS,
  });
};

async function postBlobAndDownload(
  endpoint: string,
  payload: unknown,
  filenameBase: string,
  ext: 'pdf' | 'xlsx'
): Promise<ReporteBodegaResponse<Blob>> {
  const response = await apiClient.post(endpoint, payload, { responseType: 'blob' });
  const contentType = (response.headers['content-type'] as string | undefined) || '';

  if (isJsonContent(contentType)) {
    const json = await blobToJson(response.data as Blob);
    try {
      handleBackendNotification(json);
    } catch {
      // no-op
    }
    return {
      success: false,
      message: toMessage(json, 'Error al exportar reporte'),
      errors: toErrors(json),
    };
  }

  const blob = new Blob([response.data as Blob], { type: contentType || undefined });
  const contentDisposition = response.headers['content-disposition'] as string | undefined;
  const filename = getFilename(contentDisposition, `${filenameBase}.${ext}`);
  downloadFile(blob, filename || `${filenameBase}.${ext}`);

  return { success: true, data: blob };
}

async function parseBlobError(error: unknown): Promise<ReporteBodegaResponse> {
  const fallback: ReporteBodegaResponse = {
    success: false,
    message: 'Error de conexion al generar el reporte',
    errors: { general: ['Error de red'] },
  };

  if (!error || typeof error !== 'object') return fallback;

  const err = error as {
    response?: {
      data?: unknown;
      headers?: Record<string, string>;
    };
  };

  const blobData = err.response?.data;
  const contentType = err.response?.headers?.['content-type'] || '';
  if (!(blobData instanceof Blob) || !isJsonContent(contentType)) {
    return fallback;
  }

  const json = await blobToJson(blobData);
  try {
    handleBackendNotification(json);
  } catch {
    // no-op
  }

  return {
    success: false,
    message: toMessage(json, 'Error al exportar reporte'),
    errors: toErrors(json),
  };
}

async function postJsonReporte(
  endpoint: string,
  payload: unknown,
  cacheKey: string
): Promise<ReporteBodegaResponse<ReporteBodegaData>> {
  const cached = jsonReportCache.get(cacheKey);
  if (cached && isFresh(cached)) {
    return { success: true, data: cached.data };
  }

  const inFlight = jsonReportInFlight.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const request: Promise<ReporteBodegaResponse<ReporteBodegaData>> = apiClient
    .post(endpoint, payload)
    .then((response) => {
      const unwrapped = unwrapReportePayload(response.data) as ReporteBodegaData;
      setJsonCache(cacheKey, unwrapped);
      return {
        success: true,
        data: unwrapped,
        message: toMessage(response.data, ''),
        errors: toErrors(response.data),
      };
    })
    .catch(async (error) => {
      const parsed = await parseBlobError(error);
      return {
        success: false,
        message: parsed.message,
        errors: parsed.errors,
      };
    })
    .finally(() => {
      jsonReportInFlight.delete(cacheKey);
    });

  jsonReportInFlight.set(cacheKey, request);
  return request;
}

export const reportesBodegaService = {
  async generarReporteSemanal(request: ReporteSemanalRequest): Promise<ReporteBodegaResponse> {
    try {
      const payload = { ...request };
      if (request.formato === 'json') {
        return await postJsonReporte(
          `${BASE}/semanal/`,
          payload,
          buildJsonCacheKey('semanal', payload)
        );
      }

      const ext: 'pdf' | 'xlsx' = request.formato === 'pdf' ? 'pdf' : 'xlsx';
      return await postBlobAndDownload(
        `${BASE}/semanal/`,
        payload,
        `reporte_semanal_bodega_${request.bodega}_${request.iso_semana}`,
        ext
      );
    } catch (error) {
      return parseBlobError(error);
    }
  },

  async generarReporteTemporada(request: ReporteTemporadaRequest): Promise<ReporteBodegaResponse> {
    try {
      const payload = { ...request };
      if (request.formato === 'json') {
        return await postJsonReporte(
          `${BASE}/temporada/`,
          payload,
          buildJsonCacheKey('temporada', payload)
        );
      }

      const ext: 'pdf' | 'xlsx' = request.formato === 'pdf' ? 'pdf' : 'xlsx';
      return await postBlobAndDownload(
        `${BASE}/temporada/`,
        payload,
        `reporte_temporada_bodega_${request.bodega}_T${request.temporada}`,
        ext
      );
    } catch (error) {
      return parseBlobError(error);
    }
  },

  async exportarSemanal(formato: Exclude<FormatoReporte, 'json'>, payload: ReporteSemanalDTO) {
    return this.generarReporteSemanal({ ...payload, formato });
  },

  async exportarTemporada(formato: Exclude<FormatoReporte, 'json'>, payload: ReporteTemporadaDTO) {
    return this.generarReporteTemporada({ ...payload, formato });
  },

  invalidateJsonCache() {
    jsonReportCache.clear();
    jsonReportInFlight.clear();
  },
};

export default reportesBodegaService;
