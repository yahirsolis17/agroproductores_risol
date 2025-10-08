// modules/gestion_huerta/services/reportesProduccionService.ts

import apiClient from '../../../global/api/apiClient';
import { handleBackendNotification } from '../../../global/utils/NotificationEngine';
import {
  ReporteCosechaRequest,
  ReporteTemporadaRequest,
  ReportePerfilHuertaRequest,
  ReporteProduccionResponse,
  FilaResumenHistorico,
} from '../types/reportesProduccionTypes';

// 🔁 Nueva base alineada al backend reestructurado
const BASE = '/huerta/reportes';

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
  try { return JSON.parse(text); } catch { return { message: text }; }
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

const getFilename = (cd?: string, fallback?: string) => {
  if (!cd) return fallback;
  // Soporta filename="..." y filename*=UTF-8''
  const m = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(cd);
  return m ? decodeURIComponent(m[1].replace(/"/g, '')) : fallback;
};

/** Normaliza el perfil: año→año y sanea codificaciones raras */
const normalizePerfilHuertaResponse = (rep: any) => {
  if (!rep || typeof rep !== 'object') return rep;

  // La fuente exacta suele venir como objeto de reporte (no envuelto)
  // Buscamos "resumen_historico" (top-level) o dentro de "ui.tablas"
  const histPaths = [
    ['resumen_historico'],
    ['ui', 'tablas', 'resumen_historico'],
  ];

  const normalizeArray = (arr: any[]) => {
    if (!Array.isArray(arr)) return arr;
    const out: FilaResumenHistorico[] = arr.map((row: any) => {
      // soportar "año", "año" o claves mal codificadas (por si acaso)
      const año =
        row?.año ??
        row?.año ??
        row?.['a\u00F1o'] ?? // 'año' unicode
        row?.['a\uFFFD\uFFFDo'] ?? // por si vienen bytes mal decodificados
        row?.['aï¿½ï¿½o'] ??
        row?.['a��o'] ??
        row?.['ano']; // fallback final (no ideal)
      return {
        año: año as any,
        inversion: Number(row?.inversion ?? 0),
        ventas: Number(row?.ventas ?? 0),
        ganancia: Number(row?.ganancia ?? 0),
        roi: Number(row?.roi ?? 0),
        productividad: Number(row?.productividad ?? 0),
        cosechas_count: Number(row?.cosechas_count ?? 0),
      };
    });
    return out;
  };

  for (const p of histPaths) {
    let node: any = rep;
    for (const key of p) {
      node = node?.[key];
      if (node === undefined) break;
    }
    if (node !== undefined) {
      const fixed = normalizeArray(node);
      // re-asigna en la misma ruta
      if (p.length === 1) {
        (rep as any)[p[0]] = fixed;
      } else if (p.length === 3) {
        rep.ui = rep.ui || {};
        rep.ui.tablas = rep.ui.tablas || {};
        rep.ui.tablas.resumen_historico = fixed;
      }
    }
  }

  return rep;
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
        const unwrapped = unwrapJson(resp.data);
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
        const unwrapped = unwrapJson(resp.data);
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
        const unwrapped = unwrapJson(resp.data);
        // 🔧 Normalizar año→año para calzar con tus tipos y componentes
        const normalized = normalizePerfilHuertaResponse(unwrapped);
        return { success: true, data: normalized, message: resp.data?.message, errors: resp.data?.errors };
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
