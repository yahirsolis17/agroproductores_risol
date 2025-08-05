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

export interface PaginationMeta {
  count: number;
  next: string | null;
  previous: string | null;
}
