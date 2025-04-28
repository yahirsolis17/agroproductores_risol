// src/modules/gestion_usuarios/services/permisoService.ts
import apiClient from '../../../global/api/apiClient';

export interface Permiso {
  id: number;
  nombre: string;
  codename: string;
}

const permisoService = {
  /* ───── leer todos los permisos ───── */
  async getAllPermisos(): Promise<Permiso[]> {
    const res  = await apiClient.get('/usuarios/permisos/');
    const raw  = Array.isArray(res.data) ? res.data : res.data?.data ?? [];

    return raw.map((p: any) => ({
      id:       p.id,
      nombre:   p.name ?? p.nombre,
      codename: p.codename,
    }));
  },

  /* ───── asignar permisos a un usuario ───── */
  async setUserPermisos(userId: number, permisos: string[]) {
    /*  ← URL correcta: usa guion, no guión bajo  */
    const url = `/usuarios/users/${userId}/set-permisos/`;
    const res = await apiClient.patch(url, { permisos });
    return res.data;
  },
};

export default permisoService;
