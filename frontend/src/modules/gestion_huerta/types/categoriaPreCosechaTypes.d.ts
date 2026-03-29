export interface CategoriaPreCosecha {
  id: number;
  nombre: string;
  is_active: boolean;
  archivado_en?: string | null;
  uso_count?: number;
}

export interface CategoriaPreCosechaCreateData {
  nombre: string;
}

export type CategoriaPreCosechaUpdateData = Partial<CategoriaPreCosechaCreateData>;
