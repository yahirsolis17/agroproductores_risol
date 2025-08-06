export interface Cosecha {
  id: number;
  nombre: string;
  fecha_creacion: string;     // ISO
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

  // calculados (opcionales por si el backend los expone)
  ventas_totales?: number;
  gastos_totales?: number;
  margen_ganancia?: number;
}

export interface CosechaCreateData {
  temporada: number;     // requerido para crear
  nombre?: string;       // opcional: el backend lo genera si se omite
}

export interface CosechaUpdateData {
  nombre?: string;
  finalizada?: boolean;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
}
