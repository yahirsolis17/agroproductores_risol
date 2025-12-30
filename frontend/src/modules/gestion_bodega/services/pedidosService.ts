import apiClient from '../../../global/api/apiClient';
import { ensureSuccess } from '../../../global/utils/backendEnvelope';
import type { BackendResponse } from '../../../global/types/apiTypes';

export const pedidosService = {
  list: async (params?: any): Promise<BackendResponse<any>> => {
    const res = await apiClient.get('/bodega/pedidos/', { params });
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
  retrieve: async (id: number): Promise<BackendResponse<any>> => {
    const res = await apiClient.get(`/bodega/pedidos/${id}/`);
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
  create: async (payload: any): Promise<BackendResponse<any>> => {
    const res = await apiClient.post('/bodega/pedidos/', payload);
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
  update: async (id: number, payload: any): Promise<BackendResponse<any>> => {
    const res = await apiClient.put(`/bodega/pedidos/${id}/`, payload);
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
  partialUpdate: async (id: number, payload: any): Promise<BackendResponse<any>> => {
    const res = await apiClient.patch(`/bodega/pedidos/${id}/`, payload);
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
  destroy: async (id: number): Promise<BackendResponse<any>> => {
    const res = await apiClient.delete(`/bodega/pedidos/${id}/`);
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
  surtir: async (id: number, payload: any): Promise<BackendResponse<any>> => {
    const res = await apiClient.post(`/bodega/pedidos/${id}/surtir/`, payload);
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
  cancelar: async (id: number): Promise<BackendResponse<any>> => {
    const res = await apiClient.post(`/bodega/pedidos/${id}/cancelar/`, {});
    return ensureSuccess(res.data) as BackendResponse<any>;
  },
};

export default pedidosService;
