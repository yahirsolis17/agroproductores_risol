// src/modules/gestion_usuarios/types/userTypes.ts
export interface User {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string;
  role: 'admin' | 'usuario';
  archivado_en: string | null;
  permisos: string[];
}

import { PaginationMeta } from '../../../types/pagination';
export type { PaginationMeta };
