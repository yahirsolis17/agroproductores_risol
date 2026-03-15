import apiClient from '../../../global/api/apiClient';
import { ensureSuccess } from '../../../global/utils/backendEnvelope';

export interface Permiso {
  codename: string;
  nombre: string;
  descripcion?: string;
  modulo: string;
  area?: string;
}

const permisoService = {
  async getAllPermisos(): Promise<Permiso[]> {
    const res = await apiClient.get('/usuarios/permisos-filtrados/');
    const env = ensureSuccess<{ permisos: Permiso[] }>(res.data);
    return Array.isArray(env.data.permisos) ? env.data.permisos : [];
  },

  async setUserPermisos(userId: number, permisos: string[]) {
    const url = `/usuarios/users/${userId}/set-permisos/`;
    const res = await apiClient.patch(url, { permisos });
    return ensureSuccess<{ user?: unknown }>(res.data);
  },

  async getUserPermisos(userId: number): Promise<string[]> {
    const res = await apiClient.get(`/usuarios/users/${userId}/`);
    const env = ensureSuccess<{ permisos?: string[]; user?: { permisos?: string[] } }>(res.data);
    if (Array.isArray(env.data.permisos)) {
      return env.data.permisos;
    }
    if (Array.isArray(env.data.user?.permisos)) {
      return env.data.user.permisos;
    }
    return [];
  },
};

export default permisoService;
