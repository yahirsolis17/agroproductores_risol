export interface CategoriaInversion {
  id: number;
  nombre: string;
  is_active: boolean;
  archivado_en?: string | null;
}

export interface CategoriaInversionCreate {
  nombre: string;
}

export interface CategoriaInversionUpdate {
  nombre?: string;
}
