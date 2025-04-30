// src/modules/gestion_huerta/types/propietarioTypes.d.ts
export interface Propietario {
  id: number;
  nombre: string;
  apellidos: string;
  telefono: string;
  direccion: string;
  /* ---- NUEVOS ---- */
  is_active: boolean;
  archivado_en: string | null;
}

export interface PropietarioCreateData {
  nombre: string;
  apellidos: string;
  telefono: string;
  direccion: string;
}

export interface PropietarioUpdateData {
  nombre?: string;
  apellidos?: string;
  telefono?: string;
  direccion?: string;
}
