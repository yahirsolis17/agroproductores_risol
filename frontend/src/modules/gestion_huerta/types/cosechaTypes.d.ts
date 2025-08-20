// src/modules/gestion_huerta/types/cosechaTypes.d.ts
export interface Cosecha {
  id: number;
  nombre: string;

  // fechas (ISO)
  fecha_creacion: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;

  finalizada: boolean;

  // relaciones
  temporada?: number | null;
  huerta?: number | null;
  huerta_rentada?: number | null;

  // soft delete
  is_active: boolean;
  archivado_en: string | null;

  // calculados (opcionales)
  ventas_totales?: number;
  gastos_totales?: number;
  margen_ganancia?: number;
}

export interface CosechaCreateData {
  temporada: number;      // requerido
  nombre?: string;        // opcional (el backend lo genera si se omite)
}

export interface CosechaUpdateData {
  nombre?: string;
  finalizada?: boolean;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
}
