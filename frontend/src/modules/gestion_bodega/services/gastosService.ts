import apiClient from '../../../global/api/apiClient';
import { ensureSuccess } from '../../../global/utils/backendEnvelope';
import type { BackendResponse } from '../../../global/types/apiTypes';

export const gastosService = {
  compras: {
    list: async (params?: any): Promise<BackendResponse<any>> => {
      const res = await apiClient.get('/bodega/compras-madera/', { params });
      return ensureSuccess(res.data) as BackendResponse<any>;
    },
    create: async (payload: any): Promise<BackendResponse<any>> => {
      const res = await apiClient.post('/bodega/compras-madera/', payload);
      return ensureSuccess(res.data) as BackendResponse<any>;
    },
    update: async (id: number, payload: any): Promise<BackendResponse<any>> => {
      const res = await apiClient.put(`/bodega/compras-madera/${id}/`, payload);
      return ensureSuccess(res.data) as BackendResponse<any>;
    },
    partialUpdate: async (id: number, payload: any): Promise<BackendResponse<any>> => {
      const res = await apiClient.patch(`/bodega/compras-madera/${id}/`, payload);
      return ensureSuccess(res.data) as BackendResponse<any>;
    },
    destroy: async (id: number): Promise<BackendResponse<any>> => {
      const res = await apiClient.delete(`/bodega/compras-madera/${id}/`);
      return ensureSuccess(res.data) as BackendResponse<any>;
    },
    abonos: async (id: number, payload: any): Promise<BackendResponse<any>> => {
      const res = await apiClient.post(`/bodega/compras-madera/${id}/abonos/`, payload);
      return ensureSuccess(res.data) as BackendResponse<any>;
    },
  },
  consumibles: {
    list: async (params?: any): Promise<BackendResponse<any>> => {
      const res = await apiClient.get('/bodega/consumibles/', { params });
      return ensureSuccess(res.data) as BackendResponse<any>;
    },
    create: async (payload: any): Promise<BackendResponse<any>> => {
      const res = await apiClient.post('/bodega/consumibles/', payload);
      return ensureSuccess(res.data) as BackendResponse<any>;
    },
    update: async (id: number, payload: any): Promise<BackendResponse<any>> => {
      const res = await apiClient.put(`/bodega/consumibles/${id}/`, payload);
      return ensureSuccess(res.data) as BackendResponse<any>;
    },
    partialUpdate: async (id: number, payload: any): Promise<BackendResponse<any>> => {
      const res = await apiClient.patch(`/bodega/consumibles/${id}/`, payload);
      return ensureSuccess(res.data) as BackendResponse<any>;
    },
    destroy: async (id: number): Promise<BackendResponse<any>> => {
      const res = await apiClient.delete(`/bodega/consumibles/${id}/`);
      return ensureSuccess(res.data) as BackendResponse<any>;
    },
  },
};

export default gastosService;
