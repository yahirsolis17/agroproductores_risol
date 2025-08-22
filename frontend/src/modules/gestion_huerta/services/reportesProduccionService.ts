// frontend/src/modules/gestion_huerta/services/reportesProduccionService.ts
import apiClient from '../../../global/api/apiClient';

const BASE = '/huerta/reportes-produccion';

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

const handleResponse = async (response: Response): Promise<ReporteProduccionResponse> => {
  const contentType = response.headers.get('content-type');
  
  if (contentType?.includes('application/json')) {
    const data = await response.json();
    return {
      success: response.ok,
      data: response.ok ? data : undefined,
      message: data.message,
      errors: data.errors
    };
  }
  
  // Para PDF y Excel, retornamos el blob
  if (contentType?.includes('application/pdf') || contentType?.includes('application/vnd.openxmlformats')) {
    const blob = await response.blob();
    return {
      success: response.ok,
      data: blob
    };
  }
  
  // Fallback para otros tipos de contenido
  const text = await response.text();
  return {
    success: response.ok,
    data: text
  };
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

export const reportesProduccionService = {
  async generarReporteCosecha(request: ReporteCosechaRequest): Promise<ReporteProduccionResponse> {
    try {
      // Para JSON, usar apiClient normal
      if (request.formato === 'json') {
        const response = await apiClient.post(`${BASE}/cosecha/`, request);
        return {
          success: true,
          data: response.data
        };
      }

      // Para PDF/Excel, usar fetch con responseType blob
      const authHeader = apiClient.defaults.headers.common['Authorization'];
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (authHeader && typeof authHeader === 'string') {
        headers['Authorization'] = authHeader;
      }

      const response = await fetch(`${apiClient.defaults.baseURL}${BASE}/cosecha/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      const result = await handleResponse(response);
      
      // Si es un archivo (PDF/Excel), descargarlo automáticamente
      if (result.success && result.data instanceof Blob) {
        const extension = request.formato === 'pdf' ? 'pdf' : 'xlsx';
        const filename = `reporte_cosecha_${request.cosecha_id}.${extension}`;
        downloadFile(result.data, filename);
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión al generar el reporte',
        errors: { general: ['Error de red'] }
      };
    }
  },

  async generarReporteTemporada(request: ReporteTemporadaRequest): Promise<ReporteProduccionResponse> {
    try {
      // Para JSON, usar apiClient normal
      if (request.formato === 'json') {
        const response = await apiClient.post(`${BASE}/temporada/`, request);
        return {
          success: true,
          data: response.data
        };
      }

      // Para PDF/Excel, usar fetch con responseType blob
      const authHeader = apiClient.defaults.headers.common['Authorization'];
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (authHeader && typeof authHeader === 'string') {
        headers['Authorization'] = authHeader;
      }

      const response = await fetch(`${apiClient.defaults.baseURL}${BASE}/temporada/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      const result = await handleResponse(response);
      
      // Si es un archivo (PDF/Excel), descargarlo automáticamente
      if (result.success && result.data instanceof Blob) {
        const extension = request.formato === 'pdf' ? 'pdf' : 'xlsx';
        const filename = `reporte_temporada_${request.temporada_id}.${extension}`;
        downloadFile(result.data, filename);
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión al generar el reporte',
        errors: { general: ['Error de red'] }
      };
    }
  },

  async generarReportePerfilHuerta(request: ReportePerfilHuertaRequest): Promise<ReporteProduccionResponse> {
    try {
      // Para JSON, usar apiClient normal
      if (request.formato === 'json') {
        const response = await apiClient.post(`${BASE}/perfil-huerta/`, request);
        return {
          success: true,
          data: response.data
        };
      }

      // Para PDF/Excel, usar fetch con responseType blob
      const authHeader = apiClient.defaults.headers.common['Authorization'];
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (authHeader && typeof authHeader === 'string') {
        headers['Authorization'] = authHeader;
      }

      const response = await fetch(`${apiClient.defaults.baseURL}${BASE}/perfil-huerta/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      const result = await handleResponse(response);
      
      // Si es un archivo (PDF/Excel), descargarlo automáticamente
      if (result.success && result.data instanceof Blob) {
        const extension = request.formato === 'pdf' ? 'pdf' : 'xlsx';
        const filename = `reporte_perfil_huerta_${request.huerta_id}.${extension}`;
        downloadFile(result.data, filename);
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión al generar el reporte',
        errors: { general: ['Error de red'] }
      };
    }
  },
};
