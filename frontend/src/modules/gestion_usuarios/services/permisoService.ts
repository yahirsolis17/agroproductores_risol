// src/modules/gestion_usuarios/services/permisoService.ts
import apiClient from '../../../global/api/apiClient';

export interface Permiso {
  codename: string;
  nombre: string;
  modulo: string;
}

const permisoService = {
  /** Leer solo los permisos relevantes y traducidos */
  async getAllPermisos(): Promise<Permiso[]> {
    const res = await apiClient.get('/usuarios/permisos-filtrados/');
    const payload = res.data?.data?.permisos ?? res.data;
    return Array.isArray(payload) ? payload : [];
  },

  /** Asignar permisos a un usuario */
  async setUserPermisos(userId: number, permisos: string[]) {
    const url = `/usuarios/users/${userId}/set-permisos/`;
    const res = await apiClient.patch(url, { permisos });
    return res.data;
  },

  /** Obtener los permisos **actuales** de un usuario */
  async getUserPermisos(userId: number): Promise<string[]> {
    const res = await apiClient.get(`/usuarios/users/${userId}/`);
    return res.data.permisos as string[];
  },
};

export default permisoService;
