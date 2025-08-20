// src/modules/gestion_huerta/types/categoriaInversionTypes.d.ts
export interface CategoriaInversion {
  id: number;
  nombre: string;
  is_active: boolean;
  archivado_en?: string | null;
  uso_count?: number;
}

export interface CategoriaInversionCreateData { nombre: string; }
export interface CategoriaInversionUpdateData extends Partial<CategoriaInversionCreateData> {}

