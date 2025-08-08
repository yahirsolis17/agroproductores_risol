// src/modules/gestion_huerta/types/categoriaInversionTypes.d.ts

/** Representa una categoría de inversión */
export interface CategoriaInversion {
  id: number;
  nombre: string;
  is_active: boolean;
  archivado_en?: string | null;
}

/** Payload para crear una categoría */
export interface CategoriaInversionCreateData {
  nombre: string;
}

/** Payload para actualizar una categoría */
export interface CategoriaInversionUpdateData
  extends Partial<CategoriaInversionCreateData> {}
