export interface Inversion {
  id: number;
  fecha: string; // ISO (YYYY-MM-DD)
  descripcion?: string | null;
  gastos_insumos: number;
  gastos_mano_obra: number;

  // Relación y derivados
  categoria?: { id: number; nombre: string } | null;
  categoria_id?: number;
  gastos_totales?: number;
  cosecha: number; // id
  huerta: number;  // id
  temporada: number; // id

  // Estado
  is_active: boolean;
  archivado_en?: string | null;
}

export interface InversionCreate {
  fecha: string; // ISO
  descripcion?: string | null;
  gastos_insumos: number;
  gastos_mano_obra: number;
  categoria_id: number;
  cosecha_id: number; // requerido por BE
  huerta_id: number;  // requerido por BE
  temporada_id: number; // requerido por BE
}

export interface InversionUpdate {
  fecha?: string;
  descripcion?: string | null;
  gastos_insumos?: number;
  gastos_mano_obra?: number;
  categoria_id?: number;
}
