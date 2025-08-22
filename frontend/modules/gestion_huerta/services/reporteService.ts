// frontend/modules/gestion_huerta/services/reporteService.ts
import apiClient from '../../../src/global/api/apiClient';
import { ReporteContrato } from '../types/reportTypes';

export const reporteService = {
  async getCosecha(id: number): Promise<ReporteContrato> {
    const { data } = await apiClient.get<{
      success: boolean;
      data: ReporteContrato;
    }>(`/huerta/informes/cosechas/${id}/`);
    return data.data;
  },

  async getTemporada(id: number): Promise<ReporteContrato> {
    const { data } = await apiClient.get<{
      success: boolean;
      data: ReporteContrato;
    }>(`/huerta/informes/temporadas/${id}/`);
    return data.data;
  },

  async getHuertaPerfil(id: number): Promise<ReporteContrato> {
    const { data } = await apiClient.get<{
      success: boolean;
      data: ReporteContrato;
    }>(`/huerta/informes/huertas/${id}/perfil/`);
    return data.data;
  },
};

