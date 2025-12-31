import apiClient from '../../../global/api/apiClient';
import { ensureSuccess } from '../../../global/utils/backendEnvelope';
import type { BackendResponse } from '../../../global/types/apiTypes';

export const camionesService = {
  list: async (params?: any): Promise<BackendResponse<any>> => {
    const res = await apiClient.get('/bodega/camiones/', { params });
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
  create: async (payload: any): Promise<BackendResponse<any>> => {
    const res = await apiClient.post('/bodega/camiones/', payload);
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
  update: async (id: number, payload: any): Promise<BackendResponse<any>> => {
    const res = await apiClient.put(`/bodega/camiones/${id}/`, payload);
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
  partialUpdate: async (id: number, payload: any): Promise<BackendResponse<any>> => {
    const res = await apiClient.patch(`/bodega/camiones/${id}/`, payload);
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
  destroy: async (id: number): Promise<BackendResponse<any>> => {
    const res = await apiClient.delete(`/bodega/camiones/${id}/`);
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
  confirmar: async (id: number): Promise<BackendResponse<any>> => {
    const res = await apiClient.post(`/bodega/camiones/${id}/confirmar/`, {});
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
  addItem: async (id: number, payload: any): Promise<BackendResponse<any>> => {
    const res = await apiClient.post(`/bodega/camiones/${id}/items/add/`, payload);
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
  removeItem: async (id: number, payload: any): Promise<BackendResponse<any>> => {
    const res = await apiClient.post(`/bodega/camiones/${id}/items/remove/`, payload);
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
  // Phase 2: Real Inventory
  addCarga: async (id: number, payload: { clasificacion_id: number; cantidad: number }): Promise<BackendResponse<any>> => {
    const res = await apiClient.post(`/bodega/camiones/${id}/cargas/add/`, payload);
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
  removeCarga: async (id: number, payload: { carga_id: number }): Promise<BackendResponse<any>> => {
    const res = await apiClient.post(`/bodega/camiones/${id}/cargas/remove/`, payload);
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
};

export default camionesService;
