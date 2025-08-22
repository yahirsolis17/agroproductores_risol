// frontend/src/modules/gestion_huerta/services/reporteService.ts
import apiClient from '../../../global/api/apiClient';
import { ReportPayload } from '../types/reportTypes';

type DateISO = string | undefined;

const BASE = '/huerta/informes';

const pickData = (raw: any): ReportPayload => {
  // Soporta NotificationHandler { data: {...} } y variantes
  if (raw?.data) return raw.data as ReportPayload;
  if (raw?.reporte) return raw.reporte as ReportPayload;
  return raw as ReportPayload;
};

export const reporteService = {
  async getCosecha(id: number, from?: DateISO, to?: DateISO): Promise<ReportPayload> {
    const res = await apiClient.get(`${BASE}/cosechas/${id}/`, {
      params: { from, to },
    });
    return pickData(res.data);
  },

  async getTemporada(id: number, from?: DateISO, to?: DateISO): Promise<ReportPayload> {
    const res = await apiClient.get(`${BASE}/temporadas/${id}/`, {
      params: { from, to },
    });
    return pickData(res.data);
  },

  async getHuertaPerfil(id: number, from?: DateISO, to?: DateISO): Promise<ReportPayload> {
    const res = await apiClient.get(`${BASE}/huertas/${id}/perfil/`, {
      params: { from, to },
    });
    return pickData(res.data);
  },
};
