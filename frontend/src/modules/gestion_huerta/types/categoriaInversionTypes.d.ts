export interface CategoriaInversion {
  id: number;
  nombre: string;
  is_active: boolean;
  archivado_en?: string | null;
}

export interface CategoriaInversionCreateData { nombre: string; }
export interface CategoriaInversionUpdateData extends Partial<CategoriaInversionCreateData> {}

