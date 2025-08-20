// src/modules/gestion_huerta/types/temporadaTypes.d.ts
/**
 * Estado de filtro para Temporadas (NO confundir con Estado de Huertas).
 */
export type EstadoTemporada = 'activas' | 'archivadas' | 'todas';

/**
 * Representa una temporada agrícola de una huerta propia o rentada.
 */
export interface Temporada {
  id: number;
  año: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  finalizada: boolean;
  is_active: boolean;
  archivado_en: string | null;           // <- ya no opcional, puede venir null

  // Relaciones (pueden venir en null)
  huerta?: number | null;
  huerta_rentada?: number | null;

  // Campos auxiliares para UI (pueden venir en null)
  is_rentada: boolean;
  huerta_nombre: string | null;          // <- puede ser null
  huerta_id: number | null;              // <- puede ser null
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
