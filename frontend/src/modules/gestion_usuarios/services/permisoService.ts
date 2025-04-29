// src/modules/gestion_usuarios/services/permisoService.ts
import apiClient from '../../../global/api/apiClient';

export interface Permiso {
  id: number;
  nombre: string;
  codename: string;
}

const permisoService = {
  /** Leer todos los permisos del sistema */
  async getAllPermisos(): Promise<Permiso[]> {
    const res = await apiClient.get('/usuarios/permisos/');
    const raw = Array.isArray(res.data)
      ? res.data
      : res.data?.data ?? [];
    return raw.map((p: any) => ({
      id:       p.id,
      nombre:   p.name ?? p.nombre,
      codename: p.codename,
    }));
  },

  /** Asignar permisos a un usuario */
  async setUserPermisos(userId: number, permisos: string[]) {
    const url = `/usuarios/users/${userId}/set-permisos/`;
    const res = await apiClient.patch(url, { permisos });
    return res.data;
  },

  /** 🔥 NUEVO: Obtener los permisos **actuales** de un usuario */
  async getUserPermisos(userId: number): Promise<string[]> {
    // El endpoint de retrieve de Usuario devuelve { ..., permisos: string[] }
    const res = await apiClient.get(`/usuarios/users/${userId}/`);
    return res.data.permisos as string[];
  },
};

export default permisoService;
