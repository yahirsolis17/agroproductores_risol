import apiClient from '../../../global/api/apiClient';

export const reportesBodegaService = {
  semanal: (params?: any) => apiClient.get('/gestion_bodega/reportes/semanal/', { params }),
  temporada: (params?: any) => apiClient.get('/gestion_bodega/reportes/temporada/', { params }),
};

export default reportesBodegaService;

