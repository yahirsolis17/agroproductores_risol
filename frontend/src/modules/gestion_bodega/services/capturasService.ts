import apiClient from '../../../global/api/apiClient';

export const capturasService = {
  crearRecepcion: (payload: any) => apiClient.post('/gestion_bodega/recepciones/', payload),
  crearClasificacion: (payload: any) => apiClient.post('/gestion_bodega/empaques/', payload),
  bulkUpsertClasificacion: (payload: any) => apiClient.post('/gestion_bodega/empaques/bulk-upsert/', payload),
  listarRecepciones: (params?: any) => apiClient.get('/gestion_bodega/recepciones/', { params }),
  listarClasificaciones: (params?: any) => apiClient.get('/gestion_bodega/empaques/', { params }),
};

export default capturasService;

