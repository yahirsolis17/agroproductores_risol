// src/modules/gestion_huerta/types/temporadaTypes.d.ts

/**
 * Representa una temporada agrícola de una huerta propia o rentada.
 */
export interface Temporada {
  id: number;
  año: number;
  fecha_inicio: string;
  fecha_fin?: string | null;
  finalizada: boolean;
  is_active: boolean;
  archivado_en?: string | null;
  // Relaciones
  huerta?: number | null;
  huerta_rentada?: number | null;
  // Campos auxiliares para UI
  is_rentada: boolean;
  huerta_nombre: string;
  huerta_id: number;
}

/**
 * Payload para crear una nueva temporada.
 */
export interface TemporadaCreateData {
  año: number;
  huerta?: number;
  huerta_rentada?: number;
  fecha_inicio?: string;
}

/**
 * Payload para actualizar una temporada existente.
 */
export type TemporadaUpdateData = Partial<TemporadaCreateData>;
