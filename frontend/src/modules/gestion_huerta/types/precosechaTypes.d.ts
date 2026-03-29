export interface PreCosecha {
  id: number;
  fecha: string;
  descripcion?: string | null;
  gastos_insumos: number;
  gastos_mano_obra: number;
  gastos_totales: number;
  categoria: number;
  temporada: number;
  huerta?: number | null;
  huerta_rentada?: number | null;
  is_active: boolean;
  archivado_en?: string | null;
}

export interface PreCosechaCreateData {
  fecha: string;
  categoria: number;
  temporada: number;
  gastos_insumos: number;
  gastos_mano_obra: number;
  descripcion?: string;
}

export type PreCosechaUpdateData = Partial<Omit<PreCosechaCreateData, 'temporada'>>;
